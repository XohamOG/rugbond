"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { testnet } from "@rugbond/shared";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <span className="connect">
        <button className="btn btn-small" disabled={isPending} onClick={() => connect({ connector })}>
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && <span className="connect-error">No browser wallet found</span>}
      </span>
    );
  }

  if (chainId !== testnet.id) {
    return (
      <button className="btn btn-small" onClick={() => switchChain({ chainId: testnet.id })}>
        Switch to testnet
      </button>
    );
  }

  return (
    <button className="btn btn-small btn-ghost mono" title="Disconnect" onClick={() => disconnect()}>
      {shortAddress(address!)}
    </button>
  );
}
