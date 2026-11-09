import { defineChain, parseAbi } from "viem";

export { rugBondAbi } from "./abi.ts";

export const RPC_PUBLIC = "https://rpc.testnet.chain.robinhood.com";
export const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
export const FAUCET_URL = "https://faucet.testnet.chain.robinhood.com";

export const testnet = defineChain({
  id: 46630,
  name: "Testnet 46630",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_PUBLIC] } },
  blockExplorers: { default: { name: "Explorer", url: EXPLORER } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true,
});

export const RUGBOND_ADDRESS = "0x04Afa7f0511caFB53DC91Ae7e8A8B7c8299E4813" as const;
export const MOCK_WIF_ADDRESS = "0x4aDa6E6C1568b435999e7593E62C86b0dF48a13f" as const;
export const DEMO_COIN_ADDRESS = "0x1bf8dF5d705D02FFc9d1e3c2756d2c09AF3B411F" as const;
export const DEPLOY_BLOCK = 150812184n;

export const faucetAbi = parseAbi(["function faucet()"]);

export enum BondStatus {
  None = 0,
  Active = 1,
  Slashed = 2,
}
