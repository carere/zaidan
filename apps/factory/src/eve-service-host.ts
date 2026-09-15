import { pathToFileURL } from "node:url";

// A parent crash must not leave an unsupervised Eve writer using the same world.
if (!process.send || !process.argv[2]) throw new Error("Eve host requires its local supervisor");
process.on("disconnect", () => process.exit(0));
await import(pathToFileURL(process.argv[2]).href);
