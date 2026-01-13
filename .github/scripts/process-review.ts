#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);

interface Issue {
  category: string;
  description: string;
  suggested_fix: string;
  file?: string;
  line?: number;
  severity?: string;
}

interface ReviewOutput {
  summary: string;
  issues: Issue[];
}

interface ProcessedIssue extends Issue {
  id: string;
  issue_number: number;
  status: "new" | "persisted" | "resolved";
  comment_id?: number | null;
  ignored: boolean;
  ignored_at?: string | null;
}

interface State {
  review_sha: string;
  summary: string;
  max_issue_number: number;
  issues: ProcessedIssue[];
}

function generateIssueId(issue: Issue): string {
  const file = issue.file ?? "";
  const line = issue.line ?? 0;
  const category = issue.category ?? "";
  const description = issue.description ?? "";

  const content = `${file.toLowerCase()}::${line}::${category.toLowerCase()}::${description
    .toLowerCase()
    .trim()
    .substring(0, 100)}`;
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

async function main() {
  try {
    // Load Claude's output
    const content = readFileSync("review_output.txt", "utf-8");
    const startTag = "<review_output>";
    const endTag = "</review_output>";
    const start = content.indexOf(startTag);
    const end = content.indexOf(endTag);

    if (start === -1 || end === -1) {
      console.error("ERROR: No valid <review_output> tags found");
      process.exit(1);
    }

    const reviewJson = content.substring(start + startTag.length, end);
    const review: ReviewOutput = JSON.parse(reviewJson);

    // Load previous state
    const prevStateJson = process.env.PREVIOUS_STATE ?? "{}";
    const prevState: Partial<State> = JSON.parse(prevStateJson);
    const currentSha = process.env.HEAD_SHA;

    if (!currentSha) {
      console.error("ERROR: HEAD_SHA environment variable not set");
      process.exit(1);
    }

    // Build previous issues map
    const prevById = new Map<string, ProcessedIssue>();
    for (const issue of prevState.issues ?? []) {
      prevById.set(issue.id, issue);
    }

    let maxIssueNumber = prevState.max_issue_number ?? 0;
    const newIssues: ProcessedIssue[] = [];

    // Process current issues
    for (const issue of review.issues ?? []) {
      // Validate required fields
      if (!issue.category || !issue.description || !issue.suggested_fix) {
        console.log(`WARNING: Skipping malformed issue:`, issue);
        continue;
      }

      // Ensure file field exists
      if (!issue.file) {
        issue.file = "";
      }

      const issueId = generateIssueId(issue);
      const prev = prevById.get(issueId);

      // Get or assign issue number
      let issueNumber: number;
      if (prev?.issue_number) {
        issueNumber = prev.issue_number;
      } else {
        maxIssueNumber++;
        issueNumber = maxIssueNumber;
      }

      newIssues.push({
        id: issueId,
        issue_number: issueNumber,
        status: prev ? "persisted" : "new",
        comment_id: prev?.comment_id ?? null,
        ignored: prev?.ignored ?? false,
        ignored_at: prev?.ignored_at ?? null,
        ...issue,
      });

      prevById.delete(issueId);
    }

    // Remaining previous issues are resolved
    for (const prev of prevById.values()) {
      newIssues.push({ ...prev, status: "resolved" });
    }

    // Create state
    const state: State = {
      review_sha: currentSha,
      summary: review.summary ?? "Review completed",
      max_issue_number: maxIssueNumber,
      issues: newIssues,
    };

    // Save state
    writeFileSync("state.json", JSON.stringify(state, null, 2));

    // Save compressed state for comment
    const compressed = await gzipAsync(JSON.stringify(state));
    const encoded = compressed.toString("base64");
    writeFileSync("state_encoded.txt", encoded);

    // Print summary
    const newCount = newIssues.filter((i) => i.status === "new").length;
    const persistedCount = newIssues.filter(
      (i) => i.status === "persisted"
    ).length;
    const resolvedCount = newIssues.filter(
      (i) => i.status === "resolved"
    ).length;

    console.log(`Processed ${review.issues?.length ?? 0} current issues`);
    console.log(`Found ${newCount} new issues`);
    console.log(`Found ${persistedCount} persisted issues`);
    console.log(`Found ${resolvedCount} resolved issues`);
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
