import type { BondState } from "@/lib/data";

const LABEL: Record<BondState | "none", string> = {
  bonded: "Bonded",
  short: "Short",
  slashable: "Slashable",
  broken: "Broken",
  expired: "Expired",
  none: "No bond",
};

export function Seal({ state, large = false }: { state: BondState | "none"; large?: boolean }) {
  return <span className={`seal seal-${state}${large ? " seal-large" : ""}`}>{LABEL[state]}</span>;
}
