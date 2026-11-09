import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { EXPLORER } from "@rugbond/shared";
import { Certificate } from "@/components/Certificate";
import { Seal } from "@/components/Seal";
import { byStanding, getSnapshot } from "@/lib/data";
import { shortAddress } from "@/lib/format";

export default async function CoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isAddress(token)) notFound();
  const { bonds } = await getSnapshot();
  const onCoin = bonds.filter((b) => b.token.toLowerCase() === token.toLowerCase()).sort(byStanding);
  const symbol = onCoin[0]?.symbol;

  return (
    <>
      <header className="coin-head">
        <div>
          <h1 className="page-title">{symbol ? `$${symbol}` : shortAddress(token)}</h1>
          <a className="mono small" href={`${EXPLORER}/address/${token}`} target="_blank" rel="noreferrer">
            {token}
          </a>
        </div>
        <Seal state={onCoin[0]?.state ?? "none"} large />
      </header>

      {onCoin.length === 0 ? (
        <p className="muted">
          Nobody has bonded this coin. <Link href="/bond/new">Post the first bond</Link>.
        </p>
      ) : (
        <div className="cert-grid">
          {onCoin.map((bond) => (
            <Certificate key={bond.id} bond={bond} />
          ))}
        </div>
      )}
    </>
  );
}
