import Link from "next/link";
import type { BondView } from "@/lib/data";
import { amount, bondNumber, date, shortAddress, timeLeft } from "@/lib/format";
import { Seal } from "./Seal";

export function Vow({ bond }: { bond: BondView }) {
  const first = bond.promises[0];
  if (bond.promises.length > 1) {
    return (
      <p className="vow">
        {bond.promises.length} wallets each promised to keep a minimum balance of {bond.symbol} until{" "}
        <strong>{date(bond.unlockAt)}</strong>.
      </p>
    );
  }
  return (
    <p className="vow">
      <span className="mono">{shortAddress(first.wallet)}</span> promised to hold at least{" "}
      <strong>
        {amount(first.minBalance, bond.decimals)} {bond.symbol}
      </strong>{" "}
      until <strong>{date(bond.unlockAt)}</strong>.
    </p>
  );
}

export function Certificate({ bond }: { bond: BondView }) {
  const backing = bond.slash ? bond.slash.burned + bond.slash.reward : bond.total;
  const now = Math.floor(Date.now() / 1000);
  return (
    <Link href={`/bond/${bond.id}`} className={`cert cert-${bond.state}`}>
      <div className="cert-head">
        <span className="cert-no">RugBond No. {bondNumber(bond.id)}</span>
        <Seal state={bond.state} />
      </div>
      <h3 className="cert-coin">${bond.symbol}</h3>
      <Vow bond={bond} />
      <dl className="cert-facts">
        <div>
          <dt>{bond.slash ? "Was backed by" : "Backed by"}</dt>
          <dd>{amount(backing)} mWIF</dd>
        </div>
        {bond.slash ? (
          <div>
            <dt>Burned</dt>
            <dd>{amount(bond.slash.burned)} mWIF</dd>
          </div>
        ) : (
          <div>
            <dt>Time left</dt>
            <dd>{timeLeft(bond.unlockAt - now)}</dd>
          </div>
        )}
        <div>
          <dt>Supply promised</dt>
          <dd>{bond.promisedPercent === null ? "Unknown" : `${bond.promisedPercent}%`}</dd>
        </div>
      </dl>
    </Link>
  );
}
