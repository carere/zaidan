import { appendFileSync, writeFileSync, existsSync } from "node:fs";
const coding = "/usr/local/lib/node_modules/@earendil-works/pi-coding-agent";
const { AuthStorage } = await import(`${coding}/dist/core/auth-storage.js`);
const { createModels } = await import(
  `${coding}/node_modules/@earendil-works/pi-ai/dist/models.js`
);
const { openaiCodexProvider } = await import(
  `${coding}/node_modules/@earendil-works/pi-ai/dist/providers/openai-codex.js`
);
try {
  const credentials = AuthStorage.create("/auth/auth.json");
  const provider = openaiCodexProvider();
  const refresh = provider.auth.oauth.refresh;
  provider.auth.oauth.refresh = async (...args) => {
    appendFileSync(
      "/probe/refresh-events.jsonl",
      JSON.stringify({ type: "oauth.refresh", worker: process.argv[2] }) + "\n",
    );
    return refresh(...args);
  };
  const models = createModels({ credentials });
  models.setProvider(provider);
  writeFileSync(`/probe/ready-${process.argv[2]}`, "ready");
  while (!existsSync("/probe/start")) await new Promise((r) => setTimeout(r, 20));
  const result = await models.getAuth("openai-codex");
  if (!result || result.source !== "OAuth") throw new Error("Subscription auth required");
  const current = await credentials.read("openai-codex");
  if (current.expires <= Date.now() + 300000) throw new Error("Refresh did not persist");
  console.log(
    JSON.stringify({
      worker: process.argv[2],
      authenticated: true,
      expires: current.expires,
      uid: process.getuid(),
    }),
  );
} catch {
  console.error("OAuth refresh probe failed (details withheld)");
  process.exitCode = 1;
}
