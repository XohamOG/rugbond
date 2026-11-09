import Link from "next/link";
import { EXPLORER } from "@rugbond/shared";
import { Certificate } from "@/components/Certificate";
import { TestKit } from "@/components/TestKit";
import { byStanding, getSnapshot } from "@/lib/data";
import { amount, bondNumber, dateTime, shortAddress } from "@/lib/format";

export default async function Home() {
  const { bonds, feed, locked, burned, slashes } = await getSnapshot();
  const sorted = [...bonds].sort(byStanding);

  return (
    <>
      <section className="hero">
        <h1>Every dev says &ldquo;I won&apos;t sell.&rdquo; Here, that promise has a price.</h1>
        <p>
          Creators lock WIF behind named wallets. If a wallet drops below its promise, anyone can slash the bond and the WIF
          burns. No admin decides. The contract reads a balance and acts.
        </p>
        <Link href="/bond/new" className="btn">
          Post a bond
        </Link>
      </section>

      <dl className="totals">
        <div>
          <dt>Locked now</dt>
          <dd>{amount(locked)}</dd>
          <span>mWIF</span>
        </div>
        <div>
          <dt>Burned so far</dt>
          <dd>{amount(burned)}</dd>
          <span>mWIF</span>
        </div>
        <div>
          <dt>Promises broken</dt>
          <dd>{slashes}</dd>
          <span>of {bonds.length} bonds</span>
        </div>
      </dl>

      <div className="columns">
        <section aria-labelledby="register-title">
          <h2 id="register-title" className="section-title">
            The register
          </h2>
          {sorted.length === 0 ? (
            <p className="muted">No bonds yet. Be the first to put a promise on record.</p>
          ) : (
            <div className="cert-grid">
              {sorted.map((bond) => (
                <Certificate key={bond.id} bond={bond} />
              ))}
            </div>
          )}
        </section>

        <aside className="side">
          <TestKit />
          <section aria-labelledby="ledger-title">
            <h2 id="ledger-title" className="section-title">
              Ledger
            </h2>
            {feed.length === 0 ? (
              <p className="muted">Nothing on record yet.</p>
            ) : (
              <ol className="ledger">
                {feed.map((item) => (
                  <li key={`${item.txHash}-${item.kind}`} className={item.kind === "Slashed" ? "ledger-slash" : undefined}>
                    <a href={`${EXPLORER}/tx/${item.txHash}`} target="_blank" rel="noreferrer">
                      <strong>
                        {item.kind} No. {bondNumber(item.bondId)}
                      </strong>
                      <span>{amount(item.amount)} mWIF</span>
                      <small className="mono">
                        {shortAddress(item.actor)} · {dateTime(item.time)} UTC
                      </small>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
