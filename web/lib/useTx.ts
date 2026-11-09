"use client";

import { useState } from "react";
import type { Abi, TransactionReceipt } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { testnet } from "@rugbond/shared";

type Call = { address: `0x${string}`; abi: Abi | readonly unknown[]; functionName: string; args?: readonly unknown[] };

function message(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string };
  return (e.shortMessage ?? e.message ?? "The transaction failed").split("\n")[0];
}

/** Sends one transaction at a time on the right chain and tracks its progress. */
export function useTx() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: testnet.id });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, call: Call): Promise<TransactionReceipt | null> {
    setBusy(label);
    setError(null);
    try {
      if (chainId !== testnet.id) await switchChainAsync({ chainId: testnet.id });
      const hash = await writeContractAsync({ ...call, chainId: testnet.id } as never);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted");
      return receipt;
    } catch (e) {
      setError(message(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  return { run, busy, error, setError };
}
