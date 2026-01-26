#!/usr/bin/env bun

import path from "node:path";
import { Command } from "commander";

const ENV_FILE = path.join(import.meta.dir, "..", ".env");
const DEFAULT_PORT = 3000;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const updateEnvKey = async (key: string, value: string) => {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error("env key must not be empty");
  }

  const envFile = Bun.file(ENV_FILE);
  let contents = "";

  if (await envFile.exists()) {
    contents = await envFile.text();
  }

  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const lines = contents === "" ? [] : contents.split(/\r?\n/);
  const keyPattern = new RegExp(`^(\\s*)${escapeRegExp(normalizedKey)}(\\s*=\\s*)(.*)$`);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(keyPattern);
    if (!match) {
      continue;
    }

    const [, leading, separator, rest] = match;
    const commentMatch = rest.match(/(\s+#.*)$/);
    const comment = commentMatch ? commentMatch[1] : "";
    lines[i] = `${leading}${normalizedKey}${separator}${value}${comment}`;
    updated = true;
    break;
  }

  if (!updated) {
    const newLine = `${normalizedKey}=${value}`;
    const hasTrailingEmptyLine = lines.length > 0 && lines[lines.length - 1] === "";

    if (contents.endsWith("\n") && hasTrailingEmptyLine) {
      lines.splice(lines.length - 1, 0, newLine);
    } else {
      lines.push(newLine);
    }
  }

  await Bun.write(ENV_FILE, lines.join(newline));
};

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number) {
  const canConnect = async (hostname: string) => {
    try {
      const socket = await Bun.connect({
        hostname,
        port,
        socket: {
          data() {},
        },
      });
      socket.end();
      return true;
    } catch {
      return false;
    }
  };

  const isInUse = (await canConnect("127.0.0.1")) || (await canConnect("::1"));

  return !isInUse;
}

/**
 * Find a free port starting from a given port
 */
async function findFreePort(startPort = 3000) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > 65535) {
      throw new Error("No available ports found");
    }
  }
  return port;
}

/**
 * Choose a free port for local development.
 */
async function chooseDevPort() {
  return findFreePort(DEFAULT_PORT);
}

// CLI interface
if (import.meta.main) {
  const program = new Command();

  program
    .name("setup-dev-env")
    .description("Choose a free local development port.")
    .option("--env-key <KEY>", "Write port to .env key.")
    .addHelpText(
      "after",
      "\nExamples:\n  bun scripts/setup-dev-env.ts\n  bun scripts/setup-dev-env.ts --env-key VITE_PORT\n",
    );

  program.action(async (options: { envKey?: string }) => {
    const port = await chooseDevPort();
    if (options.envKey) {
      await updateEnvKey(options.envKey, String(port));
      return;
    }
    console.log(String(port));
  });

  program.parseAsync(process.argv).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { chooseDevPort, findFreePort };
