import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { testnet } from "@rugbond/shared";

export const wagmiConfig = createConfig({
  chains: [testnet],
  connectors: [injected()],
  transports: { [testnet.id]: http() },
  ssr: true,
});
