import { deduce } from "../deduce/rules";
import { result, type Section } from "../types";

/** Not a collector of new data: what the rows above add up to, with the rows named. */
export function collectDeductions(sections: Section[]): Section {
  return {
    title: "Deductions",
    note: "What a detective would conclude from the other sections, each with the rows it leaned on. Rules, not machine learning, and the rules are in the source; every line is a guess with a stated basis.",
    results: deduce(sections).map((d) => ({ ...result(d.name, d.value, "INFERRED"), evidence: d.evidence })),
  };
}
