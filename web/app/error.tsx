"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="prose">
      <h1 className="page-title">The chain didn&apos;t answer</h1>
      <p>RugBond reads everything live from the testnet, and that read just failed. Your bonds are unaffected.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
