import { NewBondForm } from "@/components/NewBondForm";
import { TestKit } from "@/components/TestKit";

export default function NewBond() {
  return (
    <div className="columns columns-form">
      <section>
        <h1 className="page-title">Post a bond</h1>
        <p className="lede">Your connected wallet makes the promise, so it must already hold the coins.</p>
        <NewBondForm />
      </section>
      <aside className="side">
        <TestKit />
      </aside>
    </div>
  );
}
