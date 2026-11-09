import { createPublicClient, createWalletClient, http, type Account, type PublicClient, type WalletClient } from "viem";
import { testnet } from "@rugbond/shared";

const STALE_AFTER_SECONDS = 120n;

/** Tracks a priority list of RPC URLs and uses the first that is reachable and has fresh blocks. */
export class Rpc {
  private index = 0;
  private readonly publics: PublicClient[];
  private readonly wallets: WalletClient[];

  constructor(
    urls: string[],
    account: Account,
    private readonly log: (message: string) => void,
  ) {
    const transportFor = (url: string) => http(url, { timeout: 8_000, retryCount: 1 });
    this.publics = urls.map((url) => createPublicClient({ chain: testnet, transport: transportFor(url) }));
    this.wallets = urls.map((url) => createWalletClient({ account, chain: testnet, transport: transportFor(url) }));
  }

  get public(): PublicClient {
    return this.publics[this.index];
  }

  get wallet(): WalletClient {
    return this.wallets[this.index];
  }

  /** Re-checks providers in priority order and switches to the best one. */
  async refresh(): Promise<void> {
    for (let i = 0; i < this.publics.length; i++) {
      try {
        const chainId = await this.publics[i].getChainId();
        if (chainId !== testnet.id) {
          this.log(`RPC ${i} is on chain ${chainId}, expected ${testnet.id}. Skipping it`);
          continue;
        }
        const block = await this.publics[i].getBlock({ blockTag: "latest" });
        const age = BigInt(Math.floor(Date.now() / 1000)) - block.timestamp;
        if (age > STALE_AFTER_SECONDS) {
          this.log(`RPC ${i} is stale (${age}s behind)`);
          continue;
        }
        if (i !== this.index) this.log(`Switching RPC from ${this.index} to ${i}`);
        this.index = i;
        return;
      } catch {
        this.log(`RPC ${i} is unreachable`);
      }
    }
    this.log("No healthy RPC found, keeping the current one");
  }
}
