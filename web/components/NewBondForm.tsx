"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { erc20Abi, formatUnits, getAddress, isAddress, parseEventLogs, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { DEMO_COIN_ADDRESS, MOCK_WIF_ADDRESS, RUGBOND_ADDRESS, rugBondAbi, testnet } from "@rugbond/shared";
import { amount, shortAddress } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { ConnectButton } from "./ConnectButton";

const MIN_BOND = 10_000;
const MAX_BOND = 2_000_000;
const SEVEN_DAYS = 7 * 86_400;
// Covers the time between reading the clock and the transaction landing.
const UNLOCK_MARGIN = 120;

const DURATIONS = [
  { label: "10 minutes", seconds: 600 },
  { label: "1 hour", seconds: 3_600 },
  { label: "1 day", seconds: 86_400 },
  { label: "7 days", seconds: SEVEN_DAYS },
  { label: "30 days", seconds: 30 * 86_400 },
  { label: "180 days", seconds: 180 * 86_400 },
];

function toNumber(text: string): number {
  const value = Number(text.replaceAll(",", ""));
  return Number.isFinite(value) ? value : 0;
}

export function NewBondForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: testnet.id });
  const { run, busy, error, setError } = useTx();

  const [tokenText, setTokenText] = useState<string>(DEMO_COIN_ADDRESS);
  const [promiseText, setPromiseText] = useState("50000");
  const [bondText, setBondText] = useState("10000");
  const [duration, setDuration] = useState(DURATIONS[2].seconds);

  const token = isAddress(tokenText) ? getAddress(tokenText) : undefined;
  const read = { chainId: testnet.id, abi: erc20Abi } as const;
  const owner = address ? ([address] as const) : undefined;

  const symbol = useReadContract({ ...read, address: token, functionName: "symbol", query: { enabled: Boolean(token) } });
  const decimals = useReadContract({ ...read, address: token, functionName: "decimals", query: { enabled: Boolean(token) } });
  const coinBalance = useReadContract({ ...read, address: token, functionName: "balanceOf", args: owner, query: { enabled: Boolean(token && address) } });
  const wifBalance = useReadContract({ ...read, address: MOCK_WIF_ADDRESS, functionName: "balanceOf", args: owner, query: { enabled: Boolean(address) } });
  const allowance = useReadContract({
    ...read,
    address: MOCK_WIF_ADDRESS,
    functionName: "allowance",
    args: address ? [address, RUGBOND_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const promiseValue = toNumber(promiseText);
  const bondValue = toNumber(bondText);
  const coinDecimals = decimals.data ?? 18;
  const coinSymbol = symbol.data ?? "coins";
  const coinHeld = coinBalance.data !== undefined ? Number(formatUnits(coinBalance.data, coinDecimals)) : null;
  const wifHeld = wifBalance.data !== undefined ? Number(formatUnits(wifBalance.data, 18)) : null;

  let problem: string | null = null;
  if (!token) problem = "Enter a valid coin address.";
  else if (symbol.isError || decimals.isError) problem = "That address doesn't look like a token on this testnet.";
  else if (promiseValue <= 0) problem = "Enter how many coins you promise to hold.";
  else if (coinHeld !== null && promiseValue > coinHeld) problem = `Your wallet holds only ${coinHeld.toLocaleString("en-US")} ${coinSymbol}.`;
  else if (bondValue < MIN_BOND) problem = `A bond needs at least ${MIN_BOND.toLocaleString("en-US")} mWIF.`;
  else if (bondValue > MAX_BOND) problem = `A bond can be at most ${MAX_BOND.toLocaleString("en-US")} mWIF.`;
  else if (wifHeld !== null && bondValue > wifHeld) problem = `Your wallet holds only ${wifHeld.toLocaleString("en-US")} mWIF.`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || !address || !token || !publicClient) return;
    setError(null);

    const bondAmount = parseUnits(bondText.replaceAll(",", ""), 18);
    const minBalance = parseUnits(promiseText.replaceAll(",", ""), coinDecimals);

    if ((allowance.data ?? 0n) < bondAmount) {
      const approved = await run("approve", {
        address: MOCK_WIF_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [RUGBOND_ADDRESS, bondAmount],
      });
      if (!approved) return;
    }

    const { timestamp } = await publicClient.getBlock({ blockTag: "latest" });
    const receipt = await run("post", {
      address: RUGBOND_ADDRESS,
      abi: rugBondAbi,
      functionName: "post",
      args: [
        token,
        [{ wallet: address, minBalance }],
        timestamp + BigInt(duration + UNLOCK_MARGIN),
        bondAmount,
        timestamp + 3_600n,
        ["0x"],
      ],
    });
    if (!receipt) return;

    const [posted] = parseEventLogs({ abi: rugBondAbi, eventName: "BondPosted", logs: receipt.logs });
    await new Promise((resolve) => setTimeout(resolve, 3_200)); // Lets the server's short chain cache expire.
    router.push(posted ? `/bond/${posted.args.id}` : "/");
    router.refresh();
  }

  const durationLabel = DURATIONS.find((d) => d.seconds === duration)?.label;
  const buttonLabel =
    busy === "approve" ? "Approving mWIF… (1 of 2)" : busy === "post" ? "Posting bond… (2 of 2)" : "Lock mWIF and post bond";

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Coin address</span>
        <input className="mono" value={tokenText} onChange={(e) => setTokenText(e.target.value.trim())} spellCheck={false} />
        <small>
          {token && symbol.data ? `This is ${symbol.data}.` : "Any token on the testnet."} Avoid rebasing or fee-on-balance coins: a balance that shrinks by itself counts as a broken promise.
        </small>
      </label>

      <label className="field">
        <span>Coins you promise to hold</span>
        <input inputMode="decimal" value={promiseText} onChange={(e) => setPromiseText(e.target.value)} />
        <small>{coinHeld !== null ? `Your wallet holds ${coinHeld.toLocaleString("en-US")} ${coinSymbol}.` : "Connect a wallet to see your balance."}</small>
      </label>

      <label className="field">
        <span>Promise lasts for</span>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {DURATIONS.map((d) => (
            <option key={d.seconds} value={d.seconds}>
              {d.label}
            </option>
          ))}
        </select>
        {duration < SEVEN_DAYS && <small className="warn">Bonds with under 7 days left are labelled Short.</small>}
      </label>

      <label className="field">
        <span>Mock WIF to lock</span>
        <input inputMode="decimal" value={bondText} onChange={(e) => setBondText(e.target.value)} />
        <small>
          From {MIN_BOND.toLocaleString("en-US")} to {MAX_BOND.toLocaleString("en-US")}.
          {wifBalance.data !== undefined && ` You have ${amount(wifBalance.data)}.`}
        </small>
      </label>

      <aside className="preview">
        <h3>What you are signing up to</h3>
        <p>
          {address ? <span className="mono">{shortAddress(address)}</span> : "Your wallet"} keeps at least{" "}
          <strong>
            {promiseValue.toLocaleString("en-US")} {coinSymbol}
          </strong>{" "}
          for <strong>{durationLabel}</strong>. If it drops below that, even for a moment, anyone can slash the bond: you lose{" "}
          <strong>{bondValue.toLocaleString("en-US")} mWIF</strong>, 80% burned and 20% paid to whoever slashes.
        </p>
      </aside>

      {isConnected ? (
        <button className="btn" type="submit" disabled={Boolean(problem) || Boolean(busy)}>
          {buttonLabel}
        </button>
      ) : (
        <ConnectButton />
      )}
      {isConnected && problem && <p className="form-note">{problem}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
