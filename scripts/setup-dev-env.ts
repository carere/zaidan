#!/usr/bin/env bun

import path from "node:path";
import { Command } from "commander";

type Ports = {
  frontend: number;
  backend: number;
  timestamp: string;
};

type AllocateOptions = {
  log?: boolean;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const PORTS_FILE = path.join(import.meta.dir, "..", ".dev-ports.json");

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number) {
  try {
    const listener = Bun.listen({
      hostname: "localhost",
      port,
      exclusive: true,
      socket: {
        data: () => {},
      },
    });
    listener.stop(true);
    return true;
  } catch {
    return false;
  }
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
 * Load existing ports from file
 */
async function loadPorts(): Promise<Ports | null> {
  try {
    const data = await Bun.file(PORTS_FILE).text();
    return JSON.parse(data) as Ports;
  } catch (error) {
    console.warn("Failed to load existing ports:", getErrorMessage(error));
  }
  return null;
}

/**
 * Save ports to file
 */
async function savePorts(ports: Ports) {
  try {
    await Bun.write(PORTS_FILE, JSON.stringify(ports, null, 2));
  } catch (error) {
    console.error("Failed to save ports:", getErrorMessage(error));
    throw error;
  }
}

/**
 * Verify that saved ports are still available
 */
async function verifyPorts(ports: Ports, log: boolean) {
  const frontendAvailable = await isPortAvailable(ports.frontend);
  const backendAvailable = await isPortAvailable(ports.backend);

  if (log && (!frontendAvailable || !backendAvailable)) {
    console.log(
      `Port availability check failed: frontend:${ports.frontend}=${frontendAvailable}, backend:${ports.backend}=${backendAvailable}`,
    );
  }

  return frontendAvailable && backendAvailable;
}

/**
 * Allocate ports for development
 */
async function allocatePorts(options: AllocateOptions = {}) {
  const log = Boolean(options.log);

  // If PORT env is set, use it for frontend and PORT+1 for backend
  if (Bun.env.PORT) {
    const frontendPort = Number.parseInt(Bun.env.PORT, 10);
    const backendPort = frontendPort + 1;

    const ports = {
      frontend: frontendPort,
      backend: backendPort,
      timestamp: new Date().toISOString(),
    };

    if (log) {
      console.log("Using PORT environment variable:");
      console.log(`Frontend: ${ports.frontend}`);
      console.log(`Backend: ${ports.backend}`);
    }

    return ports;
  }

  // Try to load existing ports first
  const existingPorts = await loadPorts();

  if (existingPorts) {
    // Verify existing ports are still available
    if (await verifyPorts(existingPorts, log)) {
      if (log) {
        console.log("Reusing existing dev ports:");
        console.log(`Frontend: ${existingPorts.frontend}`);
        console.log(`Backend: ${existingPorts.backend}`);
      }
      return existingPorts;
    } else {
      if (log) {
        console.log("Existing ports are no longer available, finding new ones...");
      }
    }
  }

  // Find new free ports
  const frontendPort = await findFreePort(3000);
  const backendPort = await findFreePort(frontendPort + 1);

  const ports = {
    frontend: frontendPort,
    backend: backendPort,
    timestamp: new Date().toISOString(),
  };

  await savePorts(ports);

  if (log) {
    console.log("Allocated new dev ports:");
    console.log(`Frontend: ${ports.frontend}`);
    console.log(`Backend: ${ports.backend}`);
  }

  return ports;
}

/**
 * Get ports (allocate if needed)
 */
async function getPorts(options: AllocateOptions = {}) {
  const ports = await allocatePorts(options);
  return ports;
}

/**
 * Clear saved ports
 */
async function clearPorts() {
  try {
    const portsFile = Bun.file(PORTS_FILE);
    if (!(await portsFile.exists())) {
      console.log("No saved dev ports to clear");
      return;
    }

    await portsFile.delete();
    console.log("Cleared saved dev ports");
  } catch (error) {
    console.error("Failed to clear ports:", getErrorMessage(error));
  }
}

// CLI interface
if (import.meta.main) {
  const program = new Command();

  program
    .name("setup-dev-env")
    .description("Manage local development ports.")
    .addHelpText(
      "after",
      "\nExamples:\n  bun scripts/setup-dev-env.ts get\n  bun scripts/setup-dev-env.ts frontend\n  bun scripts/setup-dev-env.ts backend\n  bun scripts/setup-dev-env.ts clear\n",
    );

  program
    .command("get")
    .description("Allocate and print frontend/backend ports.")
    .action(async () => {
      const ports = await getPorts({ log: true });
      console.log(JSON.stringify(ports));
    });

  program
    .command("frontend")
    .description("Print frontend port.")
    .action(async () => {
      const ports = await getPorts();
      console.log(JSON.stringify(ports.frontend, null, 2));
    });

  program
    .command("backend")
    .description("Print backend port.")
    .action(async () => {
      const ports = await getPorts();
      console.log(JSON.stringify(ports.backend, null, 2));
    });

  program
    .command("clear")
    .description("Clear saved dev ports.")
    .action(async () => {
      await clearPorts();
    });

  program.parseAsync(process.argv).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { getPorts, clearPorts, findFreePort };
