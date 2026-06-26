import { writeFileSync, mkdirSync } from "node:fs";
import samples from "../SUST_Preli_Sample_Cases.json";
import { analyze } from "../lib/analyze";

async function main() {
  const first = (samples as any).cases[0];
  const out = await analyze(first.input);
  mkdirSync("samples", { recursive: true });
  writeFileSync(`samples/output-${first.id}.json`, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote samples/output-${first.id}.json`);
}
main();