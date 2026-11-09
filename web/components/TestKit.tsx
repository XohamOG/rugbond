"use client";

import { useRouter } from "next/navigation";
import { erc20Abi } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { DEMO_COIN_ADDRESS, FAUCET_URL, MOCK_WIF_ADDRESS, faucetAbi, testnet } from "@rugbond/shared";
import { amount } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { ConnectButton } from "./ConnectButton";

function useTokenBalance(token: `0x${string}`, owner?: `0x${string}`) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId: testnet.id,
    query: { enabled: Boolean(owner) },
  });
}

export function TestKit() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const eth = useBalance({ address, chainId: testnet.id });
  const wif = useTokenBalance(MOCK_WIF_ADDRESS, address);
  const demo = useTokenBalance(DEMO_COIN_ADDRESS, address);
  const { run, busy, error } = useTx();

  async function claim(label: string, token: `0x${string}`, refetch: () => unknown) {
    const receipt = await run(label, { address: token, abi: faucetAbi, functionName: "faucet" });
    if (receipt) {
      refetch();
      router.refresh();
    }
  }

  const onNetwork = isConnected && chainId === testnet.id;
  const needsGas = onNetwork && eth.data?.value === 0n;

  return (
    <section className="kit" aria-labelledby="kit-title">
      <h2 id="kit-title">Try it with test tokens</h2>
      <ol className="kit-steps">
        <li>
          <span>Connect a browser wallet and join the testnet.</span>
          <ConnectButton />
        </li>
        <li>
          <span>
            Get free testnet ETH for gas.
            {onNetwork && eth.data && <em className="mono"> You have {amount(eth.data.value, 18, 6)} ETH</em>}
          </span>
          <a className={`btn btn-small${needsGas ? "" : " btn-ghost"}`} href={FAUCET_URL} target="_blank" rel="noreferrer">
            Open faucet
          </a>
        </li>
        <li>
          <span>
            Claim 100,000 mock WIF to lock in a bond.
            {wif.data !== undefined && <em className="mono"> You have {amount(wif.data)}</em>}
          </span>
          <button
            className="btn btn-small"
            disabled={!isConnected || Boolean(busy)}
            onClick={() => claim("mWIF", MOCK_WIF_ADDRESS, wif.refetch)}
          >
            {busy === "mWIF" ? "Claiming…" : "Claim mWIF"}
          </button>
        </li>
        <li>
          <span>
            Claim 100,000 DEMO, the coin you promise to hold.
            {demo.data !== undefined && <em className="mono"> You have {amount(demo.data)}</em>}
          </span>
          <button
            className="btn btn-small"
            disabled={!isConnected || Boolean(busy)}
            onClick={() => claim("DEMO", DEMO_COIN_ADDRESS, demo.refetch)}
          >
            {busy === "DEMO" ? "Claiming…" : "Claim DEMO"}
          </button>
        </li>
      </ol>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
