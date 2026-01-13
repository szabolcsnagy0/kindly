#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

async function main() {
  try {
    // State was updated by inline comments step with comment_ids
    const state = JSON.parse(readFileSync('state.json', 'utf-8'));

    // Re-compress state for comment (now includes comment_ids)
    const compressed = await gzipAsync(JSON.stringify(state));
    const encoded = compressed.toString('base64');
    writeFileSync('state_encoded.txt', encoded);

    console.log('Re-encoded state with comment IDs');

  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
