import Link from "next/link";
import { notFound } from "next/navigation";
import { EXPLORER, RUGBOND_ADDRESS } from "@rugbond/shared";
import { BondActions } from "@/components/BondActions";
import { Seal } from "@/components/Seal";
import { getSnapshot } from "@/lib/data";
import { amount, bondNumber, date, shortAddress, timeLeft } from "@/lib/format";

export default async function BondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const { bonds } = await getSnapshot();
  const bond = bonds[Number(id)];
  if (!bond) notFound();

  const now = Math.floor(Date.now() / 1000);
  const rewardText = `${amount(bond.slashReward)} mWIF (20% of the poster's stake)`;

  return (
    <article className={`deed cert-${bond.state}`}>
      <header className="deed-head">
        <div>
          <p className="cert-no">RugBond No. {bondNumber(bond.id)}</p>
          <h1>
            <Link href={`/coin/${bond.token}`}>${bond.symbol}</Link>
          </h1>
        </div>
        <Seal state={bond.state} large />
      </header>

      <dl className="deed-facts">
        <div>
          <dt>Backed by</dt>
          <dd>{amount(bond.slash ? bond.slash.burned + bond.slash.reward : bond.total)} mWIF</dd>
        </div>
        <div>
          <dt>Promise ends</dt>
          <dd>
            {date(bond.unlockAt)}
            {bond.unlockAt > now && <small> {timeLeft(bond.unlockAt - now)} left</small>}
          </dd>
        </div>
        <div>
          <dt>Supply promised</dt>
          <dd>{bond.promisedPercent === null ? "Unknown" : `${bond.promisedPercent}%`}</dd>
        </div>
        <div>
          <dt>Posted by</dt>
          <dd className="mono">{shortAddress(bond.creator)}</dd>
        </div>
      </dl>

      <h2 className="section-title">Promises</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Wallet</th>
              <th scope="col">Promised</th>
              <th scope="col">Holds now</th>
              <th scope="col">Standing</th>
            </tr>
          </thead>
          <tbody>
            {bond.promises.map((p) => (
              <tr key={p.wallet}>
                <td className="mono">
                  <a href={`${EXPLORER}/address/${p.wallet}`} target="_blank" rel="noreferrer">
                    {shortAddress(p.wallet)}
                  </a>
                </td>
                <td>{amount(p.minBalance, bond.decimals)}</td>
                <td>{p.balance === null ? "Unreadable" : amount(p.balance, bond.decimals)}</td>
                <td className={p.below ? "bad" : "good"}>{p.below ? "Below promise" : "Kept"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bond.slash && (
        <section className="action action-danger">
          <h2>This promise was broken</h2>
          <p>
            <span className="mono">{shortAddress(bond.slash.wallet)}</span> fell below its promise. {amount(bond.slash.burned)}{" "}
            mWIF was burned and {amount(bond.slash.reward)} mWIF went to the caller.
          </p>
          <a href={`${EXPLORER}/tx/${bond.slash.txHash}`} target="_blank" rel="noreferrer">
            See the slash on the explorer
          </a>
        </section>
      )}

      <BondActions id={bond.id} state={bond.state} breachIndex={bond.breachIndex} rewardText={rewardText} />

      <p className="muted small">
        A bond covers only the wallets listed here. <Link href="/limits">What a bond does and doesn&apos;t mean</Link>. Contract:{" "}
        <a className="mono" href={`${EXPLORER}/address/${RUGBOND_ADDRESS}`} target="_blank" rel="noreferrer">
          {shortAddress(RUGBOND_ADDRESS)}
        </a>
      </p>
    </article>
  );
}
