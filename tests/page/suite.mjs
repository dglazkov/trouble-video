// The suite of the product's pages: its own server, on a port the server chooses, read from what it says. Every other
// .mjs here is a group of parts.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

async function serve() {
  const server = spawn("cargo", ["run", "-q", "-p", "app"], { env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"] });
  process.once("exit", () => server.kill());
  for await (const line of createInterface({ input: server.stdout })) {
    const address = line.match(/^listening on http:\/\/\S*:(\d+)$/)?.[1];
    if (address) return { base: `http://127.0.0.1:${address}/`, close: () => server.kill() };
  }
  throw new Error("the server ended without saying where it listens");
}

export default { serve, open: (page, base) => page.goto(base) };
