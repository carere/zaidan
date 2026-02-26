import { DRAFT_SLUGS } from "../src/lib/config";

const SOURCE = "src/registry/kobalte/registry.json";
const OUTPUT = "public/r/kobalte";
const TEMP = "/tmp/zaidan-registry-filtered.json";

const source = await Bun.file(SOURCE).json();

if (DRAFT_SLUGS.length > 0) {
  const before = source.items.length;
  source.items = source.items.filter((item: { name: string }) => !DRAFT_SLUGS.includes(item.name));
  console.log(`Filtered ${before - source.items.length} draft item(s): ${DRAFT_SLUGS.join(", ")}`);
  await Bun.write(TEMP, JSON.stringify(source, null, 2));
} else {
  console.log("No draft items to filter");
}

const input = DRAFT_SLUGS.length > 0 ? TEMP : SOURCE;

const result = Bun.$`bunx shadcn build ${input} --output ${OUTPUT}`;

await result;

if (DRAFT_SLUGS.length > 0) {
  await Bun.file(TEMP).delete();
}
