#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);

interface Issue {
  issue_number?: number;
  status?: "new" | "persisted" | "resolved" | "ignored";
  category: string;
  description: string;
  suggested_fix: string;
  file?: string;
  line?: number;
  severity?: string;
  comment_id?: number;
}

interface ReviewOutput {
  summary: string;
  new_issues: Issue[];
  persisted_issue_numbers: number[];
  resolved_issue_numbers: number[];
}

interface State {
  review_sha: string;
  summary: string;
  max_issue_number: number;
  issues: Issue[];
}

async function main() {
  try {
    const currentSha = process.env.HEAD_SHA;
    const reviewMode = process.env.REVIEW_MODE ?? "FULL";

    if (!currentSha) {
      console.error("ERROR: HEAD_SHA environment variable not set");
      process.exit(1);
    }

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

    // Validate review output
    if (
      !review.summary ||
      !Array.isArray(review.new_issues) ||
      !Array.isArray(review.persisted_issue_numbers) ||
      !Array.isArray(review.resolved_issue_numbers)
    ) {
      console.error("ERROR: Invalid review output structure");
      process.exit(1);
    }

    // Load previous state
    const prevStateJson = process.env.PREVIOUS_STATE ?? "{}";
    const prevState: Partial<State> = JSON.parse(prevStateJson);
    let maxIssueNumber = prevState.max_issue_number ?? 0;

    // Build map of previous issues by number
    const prevIssuesByNumber = new Map<number, Issue>();
    for (const issue of prevState.issues ?? []) {
      if (issue.issue_number) {
        prevIssuesByNumber.set(issue.issue_number, issue);
      }
    }

    const processedIssues: Issue[] = [];
    const reviewedIssueNumbers = new Set<number>();

    // Process new issues
    for (const issue of review.new_issues) {
      if (!issue.category || !issue.description || !issue.suggested_fix) {
        console.log("WARNING: Skipping malformed new issue:", issue);
        continue;
      }

      maxIssueNumber++;
      processedIssues.push({
        ...issue,
        issue_number: maxIssueNumber,
        status: "new",
      });
    }

    // Process persisted issues
    for (const issueNumber of review.persisted_issue_numbers) {
      const prevIssue = prevIssuesByNumber.get(issueNumber);
      if (!prevIssue) {
        console.log(`WARNING: Persisted issue #${issueNumber} not found in previous state`);
        continue;
      }

      processedIssues.push({
        ...prevIssue,
        status: "persisted",
      });
      reviewedIssueNumbers.add(issueNumber);
    }

    // Process resolved issues
    for (const issueNumber of review.resolved_issue_numbers) {
      const prevIssue = prevIssuesByNumber.get(issueNumber);
      if (!prevIssue) {
        console.log(`WARNING: Resolved issue #${issueNumber} not found in previous state`);
        continue;
      }

      processedIssues.push({
        ...prevIssue,
        status: "resolved",
      });
      reviewedIssueNumbers.add(issueNumber);
    }

    // In INCREMENTAL mode, carry forward issues that weren't reviewed
    if (reviewMode === "INCREMENTAL") {
      for (const prevIssue of prevState.issues ?? []) {
        if (
          prevIssue.issue_number &&
          !reviewedIssueNumbers.has(prevIssue.issue_number)
        ) {
          // Issue wasn't in review scope - carry forward unchanged
          processedIssues.push(prevIssue);
        }
      }
    }

    // Create new state
    const state: State = {
      review_sha: currentSha,
      summary: review.summary,
      max_issue_number: maxIssueNumber,
      issues: processedIssues,
    };

    // Save state
    writeFileSync("state.json", JSON.stringify(state, null, 2));

    // Save compressed state for comment
    const compressed = await gzipAsync(JSON.stringify(state));
    const encoded = compressed.toString("base64");
    writeFileSync("state_encoded.txt", encoded);

    // Print summary
    const statusCounts = {
      new: 0,
      persisted: 0,
      resolved: 0,
      ignored: 0,
    };

    for (const issue of processedIssues) {
      if (issue.status) {
        statusCounts[issue.status]++;
      }
    }

    console.log(`Review mode: ${reviewMode}`);
    console.log(`Received from Claude:`);
    console.log(`  New issues: ${review.new_issues.length}`);
    console.log(`  Persisted: ${review.persisted_issue_numbers.length}`);
    console.log(`  Resolved: ${review.resolved_issue_numbers.length}`);
    console.log(`Total issues in state: ${processedIssues.length}`);
    console.log(`  New: ${statusCounts.new}`);
    console.log(`  Persisted: ${statusCounts.persisted}`);
    console.log(`  Resolved: ${statusCounts.resolved}`);
    console.log(`  Ignored: ${statusCounts.ignored}`);
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
