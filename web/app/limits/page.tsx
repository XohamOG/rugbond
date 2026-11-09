import { EXPLORER, MOCK_WIF_ADDRESS, RUGBOND_ADDRESS } from "@rugbond/shared";

export default function Limits() {
  return (
    <article className="prose">
      <h1 className="page-title">What a bond means, and what it doesn&apos;t</h1>

      <h2>It means</h2>
      <p>
        These specific wallets agreed to keep at least this many coins until this date, this much WIF is locked behind that,
        and breaking it burns the WIF.
      </p>

      <h2>It does not mean</h2>
      <ul>
        <li>
          <strong>The coin is safe or a good buy.</strong> A bond says nothing about the coin itself.
        </li>
        <li>
          <strong>The creator has no other wallets.</strong> Coins in undeclared wallets aren&apos;t covered. This is the main
          limit of the design.
        </li>
        <li>
          <strong>Buyers get compensated.</strong> Slashed WIF is burned, not paid out to holders.
        </li>
        <li>
          <strong>The bond is bigger than what a dump would earn.</strong> A creator can decide that selling is worth losing
          the bond.
        </li>
      </ul>

      <h2>How a slash works</h2>
      <p>
        If a promised wallet is below its amount, anyone can slash the bond before it ends. The caller earns 20% of what the
        poster locked. Everything else is burned, including all WIF other people added. A creator who slashes their own bond
        still loses 80% of their stake.
      </p>
      <p>
        Moving coins to another wallet counts as breaking the promise. If a seller restores the balance before anyone slashes,
        the bond survives, because the contract reads the balance at the moment of the slash.
      </p>

      <h2>This deployment</h2>
      <p>
        This site runs on a testnet with a mock WIF that anyone can claim for free. Nothing here has real value, and burns only
        affect the mock token. The contract is unaudited, has no admin and can&apos;t be changed.
      </p>
      <ul>
        <li>
          RugBond contract:{" "}
          <a className="mono" href={`${EXPLORER}/address/${RUGBOND_ADDRESS}`} target="_blank" rel="noreferrer">
            {RUGBOND_ADDRESS}
          </a>
        </li>
        <li>
          Mock WIF:{" "}
          <a className="mono" href={`${EXPLORER}/address/${MOCK_WIF_ADDRESS}`} target="_blank" rel="noreferrer">
            {MOCK_WIF_ADDRESS}
          </a>
        </li>
      </ul>
    </article>
  );
}
