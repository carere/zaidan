import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { prepareEveWorld } from "./eve-local-recovery.ts";

// A parent crash must not leave an unsupervised Eve writer using the same world.
if (!process.send || !process.argv[2]) throw new Error("Eve host requires its local supervisor");
process.on("disconnect", () => process.exit(0));
const owner = prepareEveWorld(join(process.cwd(), ".eve", ".workflow-data"));
process.on("exit", owner.release);
await import(pathToFileURL(process.argv[2]).href);
