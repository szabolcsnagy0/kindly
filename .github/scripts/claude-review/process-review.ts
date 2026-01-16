#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { State, Issue, ReviewOutput, IssueStatus } from "./lib/types";
import { StateManager } from "./lib/state-manager";

function extractReviewOutput(content: string): string {
  // Use regex to find the last occurrence
  const regex = /<review_output>([\s\S]*?)<\/review_output>/g;
  const matches = Array.from(content.matchAll(regex));

  if (matches.length === 0) {
    throw new Error("No <review_output> tags found in output");
  }

  // Take the last match
  return matches[matches.length - 1][1].trim();
}

function validateReviewOutput(review: any): review is ReviewOutput {
  if (
    !Array.isArray(review.new_issues) ||
    !Array.isArray(review.persisted_issue_numbers) ||
    !Array.isArray(review.resolved_issue_numbers)
  ) {
    console.error("ERROR: Review output missing required arrays");
    return false;
  }

  // Validate new issues have required fields
  for (const issue of review.new_issues) {
    if (!issue.category || !issue.description || !issue.suggested_fix) {
      console.error("ERROR: New issue missing required fields:", issue);
      return false;
    }
    if (issue.severity && !["high", "medium", "low"].includes(issue.severity)) {
      console.error("ERROR: Invalid severity:", issue.severity);
      return false;
    }
  }

  // Validate issue numbers are positive integers
  const allNumbers = [
    ...review.persisted_issue_numbers,
    ...review.resolved_issue_numbers,
  ];

  if (allNumbers.some((n) => !Number.isInteger(n) || n <= 0)) {
    console.error("ERROR: Invalid issue numbers found");
    return false;
  }

  // Check for duplicates
  const numberSet = new Set(allNumbers);
  if (numberSet.size !== allNumbers.length) {
    console.error("ERROR: Duplicate issue numbers in output");
    return false;
  }

  return true;
}

function processReferencedIssues(
  issueNumbers: number[],
  status: IssueStatus,
  prevIssuesByNumber: Map<number, Issue>,
  processedIssues: Issue[],
  reviewedIssueNumbers: Set<number>
): void {
  for (const issueNumber of issueNumbers) {
    const prevIssue = prevIssuesByNumber.get(issueNumber);
    if (!prevIssue) {
      console.log(
        `WARNING: ${status} issue #${issueNumber} not found in previous state`
      );
      continue;
    }

    processedIssues.push({
      ...prevIssue,
      status,
    });
    reviewedIssueNumbers.add(issueNumber);
  }
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
    const reviewJson = extractReviewOutput(content);
    const review: ReviewOutput = JSON.parse(reviewJson);

    // Validate review output
    if (!validateReviewOutput(review)) {
      console.error("ERROR: Invalid review output structure");
      process.exit(1);
    }

    // Load previous state (with ignored issues already applied)
    const prevState = StateManager.load("state.json");
    let maxIssueNumber = prevState.max_issue_number;

    console.log(`Loaded previous state with ${prevState.issues.length} issues`);

    // Build map of previous issues by number
    const prevIssuesByNumber = new Map<number, Issue>();
    for (const issue of prevState.issues) {
      if (issue.issue_number) {
        prevIssuesByNumber.set(issue.issue_number, issue);
      }
    }

    const processedIssues: Issue[] = [];
    const reviewedIssueNumbers = new Set<number>();

    // Process new issues
    for (const issue of review.new_issues) {
      maxIssueNumber++;
      processedIssues.push({
        ...issue,
        issue_number: maxIssueNumber,
        status: "new",
      });
    }

    // Process persisted issues
    processReferencedIssues(
      review.persisted_issue_numbers,
      "persisted",
      prevIssuesByNumber,
      processedIssues,
      reviewedIssueNumbers
    );

    // Process resolved issues
    processReferencedIssues(
      review.resolved_issue_numbers,
      "resolved",
      prevIssuesByNumber,
      processedIssues,
      reviewedIssueNumbers
    );

    // In INCREMENTAL mode, carry forward issues that weren't reviewed
    if (reviewMode === "INCREMENTAL") {
      for (const prevIssue of prevState.issues) {
        if (
          prevIssue.issue_number &&
          !reviewedIssueNumbers.has(prevIssue.issue_number)
        ) {
          // Issue wasn't in review scope - carry forward unchanged
          processedIssues.push(prevIssue);
        }
      }
    }

    const state: State = {
      review_sha: currentSha,
      max_issue_number: maxIssueNumber,
      issues: processedIssues,
    };

    StateManager.save(state, "state.json");

    const encoded = await StateManager.encode(state);
    writeFileSync("state_encoded.txt", encoded);

    const statusCounts = StateManager.getStatusCounts(state);

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
