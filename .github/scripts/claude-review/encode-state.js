#!/usr/bin/env node

import { writeFileSync } from "fs";
import { StateManager } from "./lib/state-manager.js";

async function main() {
  try {
    const state = StateManager.load("state.json");
    const encoded = await StateManager.encode(state);
    writeFileSync("state_encoded.txt", encoded);
    console.log("Encoded state for summary");
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
