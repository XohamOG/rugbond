import { createPublicClient, erc20Abi, http, type Address, type Hash } from "viem";
import { BondStatus, DEPLOY_BLOCK, RPC_PUBLIC, RUGBOND_ADDRESS, rugBondAbi, testnet } from "@rugbond/shared";

const client = createPublicClient({
  chain: testnet,
  transport: http(process.env.RPC_PRIMARY || RPC_PUBLIC, { timeout: 10_000, retryCount: 2 }),
  batch: { multicall: true },
});

export type BondState = "bonded" | "short" | "slashable" | "broken" | "expired";

export type PromiseView = {
  wallet: Address;
  minBalance: bigint;
  /** Null when the token's balanceOf failed, which the contract treats as a breach. */
  balance: bigint | null;
  below: boolean;
};

export type SlashView = { caller: Address; wallet: Address; burned: bigint; reward: bigint; txHash: Hash };

export type BondView = {
  id: number;
  creator: Address;
  token: Address;
  symbol: string;
  decimals: number;
  supply: bigint;
  unlockAt: number;
  total: bigint;
  state: BondState;
  promises: PromiseView[];
  /** What a slash would pay the caller right now. */
  slashReward: bigint;
  breachIndex: number | null;
  promisedPercent: number | null;
  slash: SlashView | null;
};

export type FeedItem = {
  kind: "Posted" | "Funded" | "Slashed" | "Withdrawn";
  bondId: number;
  actor: Address;
  amount: bigint;
  txHash: Hash;
  time: number;
};

export type Snapshot = { bonds: BondView[]; feed: FeedItem[]; locked: bigint; burned: bigint; slashes: number };

const SEVEN_DAYS = 7 * 86_400;
const SLASH_REWARD_BPS = 2_000n;
const FEED_LENGTH = 10;
const CACHE_MS = 3_000;

function read<T>(functionName: "bonds" | "promisesOf", id: bigint): Promise<T> {
  return client.readContract({
    address: RUGBOND_ADDRESS,
    abi: rugBondAbi,
    functionName: functionName as never,
    args: [id] as never,
  }) as Promise<T>;
}

async function tokenInfo(token: Address) {
  const [symbol, decimals, supply] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "UNKNOWN"),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    client.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }).catch(() => 0n),
  ]);
  return { symbol, decimals, supply };
}

function stateOf(status: number, unlockAt: number, now: number, breached: boolean): BondState {
  if (status === BondStatus.Slashed) return "broken";
  if (now >= unlockAt) return "expired";
  if (breached) return "slashable";
  return unlockAt - now < SEVEN_DAYS ? "short" : "bonded";
}

async function load(): Promise<Snapshot> {
  const now = Math.floor(Date.now() / 1000);
  const [nextId, logs] = await Promise.all([
    client.readContract({ address: RUGBOND_ADDRESS, abi: rugBondAbi, functionName: "nextId" }),
    client.getContractEvents({ address: RUGBOND_ADDRESS, abi: rugBondAbi, fromBlock: DEPLOY_BLOCK, toBlock: "latest" }),
  ]);

  const slashes = new Map<number, SlashView>();
  const raw: Omit<FeedItem, "time">[] = [];
  let burned = 0n;
  for (const log of logs) {
    const txHash = log.transactionHash;
    if (log.eventName === "BondPosted") {
      raw.push({ kind: "Posted", bondId: Number(log.args.id), actor: log.args.creator!, amount: log.args.amount!, txHash });
    } else if (log.eventName === "BondFunded") {
      raw.push({ kind: "Funded", bondId: Number(log.args.id), actor: log.args.funder!, amount: log.args.amount!, txHash });
    } else if (log.eventName === "BondWithdrawn") {
      raw.push({ kind: "Withdrawn", bondId: Number(log.args.id), actor: log.args.funder!, amount: log.args.amount!, txHash });
    } else if (log.eventName === "BondSlashed") {
      const { id, caller, wallet, burned: b, reward } = log.args;
      burned += b!;
      slashes.set(Number(id), { caller: caller!, wallet: wallet!, burned: b!, reward: reward!, txHash });
      raw.push({ kind: "Slashed", bondId: Number(id), actor: caller!, amount: b! + reward!, txHash });
    }
  }

  const recent = raw.slice(-FEED_LENGTH).reverse();
  const recentLogs = logs.slice(-FEED_LENGTH * 2);
  const blockOf = new Map(recentLogs.map((l) => [l.transactionHash as string, l.blockNumber]));
  const times = new Map<bigint, number>();
  await Promise.all(
    [...new Set(recent.map((r) => blockOf.get(r.txHash)!))].map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      times.set(blockNumber, Number(block.timestamp));
    }),
  );
  const feed: FeedItem[] = recent.map((r) => ({ ...r, time: times.get(blockOf.get(r.txHash)!) ?? 0 }));

  const ids = Array.from({ length: Number(nextId) }, (_, i) => BigInt(i));
  type RawBond = readonly [Address, Address, bigint, number, bigint];
  type RawPromise = readonly { wallet: Address; minBalance: bigint }[];
  const [rawBonds, rawPromises] = await Promise.all([
    Promise.all(ids.map((id) => read<RawBond>("bonds", id))),
    Promise.all(ids.map((id) => read<RawPromise>("promisesOf", id))),
  ]);

  const tokens = [...new Set(rawBonds.map((b) => b[1]))];
  const infos = new Map(await Promise.all(tokens.map(async (t) => [t, await tokenInfo(t)] as const)));

  const bonds: BondView[] = await Promise.all(
    rawBonds.map(async ([creator, token, unlockAtRaw, status, total], i) => {
      const unlockAt = Number(unlockAtRaw);
      const info = infos.get(token)!;
      const promises: PromiseView[] = await Promise.all(
        rawPromises[i].map(async ({ wallet, minBalance }) => {
          const balance = await client
            .readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [wallet] })
            .catch(() => null);
          return { wallet, minBalance, balance, below: balance === null || balance < minBalance };
        }),
      );
      const posterStake = await client.readContract({
        address: RUGBOND_ADDRESS,
        abi: rugBondAbi,
        functionName: "contributions",
        args: [BigInt(i), creator],
      });
      const firstBelow = promises.findIndex((p) => p.below);
      const promised = promises.reduce((sum, p) => sum + p.minBalance, 0n);
      return {
        id: i,
        creator,
        token,
        symbol: info.symbol,
        decimals: info.decimals,
        supply: info.supply,
        unlockAt,
        total,
        promises,
        slashReward: (posterStake * SLASH_REWARD_BPS) / 10_000n,
        state: stateOf(status, unlockAt, now, firstBelow >= 0),
        breachIndex: firstBelow >= 0 ? firstBelow : null,
        promisedPercent: info.supply > 0n ? Number((promised * 10_000n) / info.supply) / 100 : null,
        slash: slashes.get(i) ?? null,
      };
    }),
  );

  const locked = bonds.reduce((sum, b) => sum + b.total, 0n);
  return { bonds, feed, locked, burned, slashes: slashes.size };
}

let cache: { at: number; value: Promise<Snapshot> } | null = null;

/** Reads everything from the chain, sharing one read across requests for a few seconds. */
export function getSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = load();
  cache = { at: Date.now(), value };
  value.catch(() => {
    cache = null;
  });
  return value;
}

const RANK: Record<BondState, number> = { bonded: 0, short: 1, slashable: 2, expired: 3, broken: 4 };

/** Live bonds first, then largest first. */
export function byStanding(a: BondView, b: BondView): number {
  const rank = RANK[a.state] - RANK[b.state];
  if (rank !== 0) return rank;
  const size = (b.slash ? b.slash.burned + b.slash.reward : b.total) - (a.slash ? a.slash.burned + a.slash.reward : a.total);
  return size > 0n ? 1 : size < 0n ? -1 : 0;
}
