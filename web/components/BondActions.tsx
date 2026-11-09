"use client";

import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { RUGBOND_ADDRESS, rugBondAbi, testnet } from "@rugbond/shared";
import type { BondState } from "@/lib/data";
import { amount } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { ConnectButton } from "./ConnectButton";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function BondActions({
  id,
  state,
  breachIndex,
  rewardText,
}: {
  id: number;
  state: BondState;
  breachIndex: number | null;
  rewardText: string;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { run, busy, error } = useTx();
  const stake = useReadContract({
    address: RUGBOND_ADDRESS,
    abi: rugBondAbi,
    functionName: "contributions",
    args: address ? [BigInt(id), address] : undefined,
    chainId: testnet.id,
    query: { enabled: Boolean(address) && state === "expired" },
  });

  async function send(label: string, functionName: "slash" | "withdraw", args: readonly unknown[]) {
    const receipt = await run(label, { address: RUGBOND_ADDRESS, abi: rugBondAbi, functionName, args });
    if (receipt) {
      await sleep(3_200); // Lets the server's short chain cache expire.
      stake.refetch();
      router.refresh();
    }
  }

  if (state === "slashable" && breachIndex !== null) {
    return (
      <section className="action action-danger">
        <h2>This promise is broken and can be slashed</h2>
        <p>Anyone can do it. The caller earns {rewardText} and everything else in the bond is burned.</p>
        {isConnected ? (
          <button
            className="btn btn-danger"
            disabled={Boolean(busy)}
            onClick={() => send("slash", "slash", [BigInt(id), BigInt(breachIndex)])}
          >
            {busy ? "Slashing…" : "Slash this bond"}
          </button>
        ) : (
          <ConnectButton />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  if (state === "expired") {
    const value = stake.data ?? 0n;
    return (
      <section className="action">
        <h2>The promise was kept</h2>
        <p>Everyone who funded this bond can take their mock WIF back.</p>
        {!isConnected ? (
          <ConnectButton />
        ) : value > 0n ? (
          <button className="btn" disabled={Boolean(busy)} onClick={() => send("withdraw", "withdraw", [BigInt(id)])}>
            {busy ? "Withdrawing…" : `Withdraw ${amount(value)} mWIF`}
          </button>
        ) : (
          <p className="muted">This wallet has nothing left to withdraw from this bond.</p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return null;
}
