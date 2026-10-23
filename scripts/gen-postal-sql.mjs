// Býr til SQL-innsetningu fyrir public.postal_codes úr src/lib/places.ts
// Notkun: node scripts/gen-postal-sql.mjs [skrá.sql]  (bætir aftan við skrána, annars á stdout)
import { appendFileSync, readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/places.ts", import.meta.url), "utf8");
const rows = [...src.matchAll(/"(\d{3})": \["([^"]+)", (-?[\d.]+), (-?[\d.]+)\]/g)].map(
  ([, code, name, lat, lng]) => `  ('${code}', '${name.replace(/'/g, "''")}', ${lat}, ${lng})`,
);
const sql = `insert into public.postal_codes (code, name, lat, lng) values\n${rows.join(",\n")};\n`;
if (process.argv[2]) appendFileSync(process.argv[2], `\n-- Póstnúmer (búið til með scripts/gen-postal-sql.mjs)\n${sql}`, "utf8");
else process.stdout.write(sql);
