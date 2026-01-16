#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, renameSync } from "fs";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export class StateManager {
  static load(path = "state.json") {
    if (!existsSync(path)) {
      return this.createEmpty();
    }

    try {
      const content = readFileSync(path, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`ERROR: Failed to load state from ${path}:`, error);
      throw error;
    }
  }

  static save(state, path = "state.json") {
    try {
      const tempPath = `${path}.tmp`;
      writeFileSync(tempPath, JSON.stringify(state, null, 2));
      renameSync(tempPath, path);
    } catch (error) {
      console.error(`ERROR: Failed to save state to ${path}:`, error);
      throw error;
    }
  }

  static async encode(state) {
    try {
      const json = JSON.stringify(state);
      const compressed = await gzipAsync(json);
      return compressed.toString("base64");
    } catch (error) {
      console.error("ERROR: Failed to encode state:", error);
      throw error;
    }
  }

  static async decode(encoded) {
    try {
      const compressed = Buffer.from(encoded, "base64");
      const json = (await gunzipAsync(compressed)).toString("utf-8");
      return JSON.parse(json);
    } catch (error) {
      console.error("ERROR: Failed to decode state:", error);
      throw error;
    }
  }

  static createEmpty() {
    return {
      review_sha: "",
      max_issue_number: 0,
      issues: [],
    };
  }

  static getActiveIssues(state) {
    return state.issues.filter(
      (issue) => issue.status !== "resolved" && issue.status !== "ignored"
    );
  }

  static filterByStatus(state, ...statuses) {
    return state.issues.filter(
      (issue) => issue.status && statuses.includes(issue.status)
    );
  }

  static getStatusCounts(state) {
    return state.issues.reduce(
      (acc, issue) => {
        if (issue.status) {
          acc[issue.status]++;
        }
        return acc;
      },
      { new: 0, persisted: 0, resolved: 0, ignored: 0 }
    );
  }
}
