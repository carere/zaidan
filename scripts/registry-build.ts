const SOURCE = "src/registry/kobalte/registry.json";
const OUTPUT = "public/r/kobalte";

await Bun.$`bunx shadcn build ${SOURCE} --output ${OUTPUT}`;
