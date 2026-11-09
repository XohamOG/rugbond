import { erc20Abi, formatUnits, parseAbiItem, parseEventLogs, type Address, type Hash } from "viem";
import { BondStatus, EXPLORER, rugBondAbi } from "@rugbond/shared";
import type { Rpc } from "./rpc.ts";
import { formatSlash, sendTelegram } from "./telegram.ts";

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const MAX_LOG_RANGE = 5_000n;

type TrackedBond = { id: bigint; token: Address; wallets: Address[]; unlockAt: bigint };
type Sale = { blockNumber: bigint; txHash: Hash };
type BondTuple = readonly [Address, Address, bigint, number, bigint];

export type WatcherOptions = {
  rpc: Rpc;
  rugBond: Address;
  telegramToken?: string;
  telegramChatId?: string;
  log: (event: string, fields?: Record<string, unknown>) => void;
};

const now = () => BigInt(Math.floor(Date.now() / 1000));

export class Watcher {
  private readonly bonds = new Map<bigint, TrackedBond>();
  private readonly inFlight = new Set<bigint>();
  private nextBondToLoad = 0n;
  private lastBlock: bigint | null = null;

  constructor(private readonly o: WatcherOptions) {}

  get trackedCount(): number {
    return this.bonds.size;
  }

  private readBond(id: bigint): Promise<BondTuple> {
    return this.o.rpc.public.readContract({ address: this.o.rugBond, abi: rugBondAbi, functionName: "bonds", args: [id] });
  }

  /** Loads bonds posted since the last call. */
  async loadNewBonds(): Promise<void> {
    const { rpc, rugBond } = this.o;
    const nextId = await rpc.public.readContract({ address: rugBond, abi: rugBondAbi, functionName: "nextId" });
    for (; this.nextBondToLoad < nextId; this.nextBondToLoad++) {
      const id = this.nextBondToLoad;
      const [, token, unlockAt, status] = await this.readBond(id);
      if (status !== BondStatus.Active || unlockAt <= now()) continue;
      const promises = await rpc.public.readContract({ address: rugBond, abi: rugBondAbi, functionName: "promisesOf", args: [id] });
      this.bonds.set(id, { id, token, unlockAt, wallets: promises.map((p) => p.wallet) });
      this.o.log("tracking", { id, token, wallets: promises.length });
    }
  }

  /** Reacts to outgoing transfers from declared wallets since the last poll. */
  async pollTransfers(): Promise<void> {
    const { rpc } = this.o;
    const latest = await rpc.public.getBlockNumber();
    if (this.lastBlock === null || this.bonds.size === 0) {
      this.lastBlock = latest;
      return;
    }
    if (latest <= this.lastBlock) return;

    const fromBlock = this.lastBlock + 1n;
    const toBlock = latest - fromBlock > MAX_LOG_RANGE ? fromBlock + MAX_LOG_RANGE : latest;
    const tracked = [...this.bonds.values()];
    const logs = await rpc.public.getLogs({
      address: [...new Set(tracked.map((b) => b.token))],
      event: transferEvent,
      args: { from: [...new Set(tracked.flatMap((b) => b.wallets))] },
      fromBlock,
      toBlock,
    });
    this.lastBlock = toBlock;

    for (const log of logs) {
      const from = log.args.from?.toLowerCase();
      for (const bond of tracked) {
        const matches =
          bond.token.toLowerCase() === log.address.toLowerCase() && bond.wallets.some((w) => w.toLowerCase() === from);
        if (matches) await this.check(bond, { blockNumber: log.blockNumber, txHash: log.transactionHash });
      }
    }
  }

  /** Full pass over every tracked bond. Catches anything the log poll missed and prunes finished bonds. */
  async sweep(): Promise<void> {
    for (const bond of [...this.bonds.values()]) {
      if (bond.unlockAt <= now()) {
        this.bonds.delete(bond.id);
        this.o.log("expired", { id: bond.id });
        continue;
      }
      const [, , , status] = await this.readBond(bond.id);
      if (status !== BondStatus.Active) {
        this.bonds.delete(bond.id);
        this.o.log("no longer active", { id: bond.id });
        continue;
      }
      await this.check(bond, null);
    }
  }

  private async check(bond: TrackedBond, sale: Sale | null): Promise<void> {
    if (this.inFlight.has(bond.id) || !this.bonds.has(bond.id)) return;
    const { rpc, rugBond } = this.o;
    const [breached, index] = await rpc.public.readContract({
      address: rugBond,
      abi: rugBondAbi,
      functionName: "findBreach",
      args: [bond.id],
    });
    if (!breached) return;
    this.inFlight.add(bond.id);
    try {
      await this.slash(bond, index, sale);
    } finally {
      this.inFlight.delete(bond.id);
    }
  }

  private async slash(bond: TrackedBond, index: bigint, sale: Sale | null): Promise<void> {
    const { rpc, rugBond } = this.o;
    const detectedAt = performance.now();
    const account = rpc.wallet.account!;
    const call = { account, address: rugBond, abi: rugBondAbi, functionName: "slash", args: [bond.id, index] } as const;
    this.o.log("breach detected", { id: bond.id, index, saleTx: sale?.txHash ?? "sweep" });

    let hash: Hash;
    try {
      const [{ request }, estimate] = await Promise.all([
        rpc.public.simulateContract(call),
        rpc.public.estimateContractGas(call),
      ]);
      hash = await rpc.wallet.writeContract({ ...request, gas: (estimate * 13n) / 10n });
    } catch (error) {
      // Usually another watcher got there first or the seller restored the balance.
      this.o.log("slash not sent", { id: bond.id, reason: shortReason(error) });
      return;
    }
    const sentAt = performance.now();

    const receipt = await rpc.public.waitForTransactionReceipt({ hash, timeout: 60_000 });
    const confirmedAt = performance.now();
    if (receipt.status !== "success") {
      this.o.log("slash reverted", { id: bond.id, hash });
      return;
    }
    this.bonds.delete(bond.id);

    let saleToSlashSeconds: bigint | null = null;
    if (sale) {
      const [slashBlock, saleBlock] = await Promise.all([
        rpc.public.getBlock({ blockNumber: receipt.blockNumber }),
        rpc.public.getBlock({ blockNumber: sale.blockNumber }),
      ]);
      saleToSlashSeconds = slashBlock.timestamp - saleBlock.timestamp;
    }
    this.o.log("slashed", {
      id: bond.id,
      hash,
      detectToSentMs: Math.round(sentAt - detectedAt),
      detectToConfirmedMs: Math.round(confirmedAt - detectedAt),
      saleToSlashSeconds,
    });

    await this.notify(bond, hash, receipt.logs);
  }

  private async notify(bond: TrackedBond, hash: Hash, logs: Parameters<typeof parseEventLogs>[0]["logs"]): Promise<void> {
    const { rpc } = this.o;
    const [event] = parseEventLogs({ abi: rugBondAbi, eventName: "BondSlashed", logs });
    if (!event) return;
    const [symbol, decimals] = await Promise.all([
      rpc.public.readContract({ address: bond.token, abi: erc20Abi, functionName: "symbol" }).catch(() => "tokens"),
      rpc.public.readContract({ address: bond.token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    ]);
    const text = formatSlash({
      bondId: bond.id,
      wallet: event.args.wallet,
      balance: formatUnits(event.args.balance, decimals),
      minBalance: formatUnits(event.args.minBalance, decimals),
      coinSymbol: symbol,
      burned: formatUnits(event.args.burned, 18),
      reward: formatUnits(event.args.reward, 18),
      txUrl: `${EXPLORER}/tx/${hash}`,
    });
    const sent = await sendTelegram(this.o.telegramToken, this.o.telegramChatId, text, (m) => this.o.log(m));
    if (sent) this.o.log("telegram sent", { id: bond.id });
  }
}

function shortReason(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string };
  return (e.shortMessage ?? e.message ?? "unknown").split("\n")[0].slice(0, 160);
}
