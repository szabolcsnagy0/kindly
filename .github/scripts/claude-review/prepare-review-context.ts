#!/usr/bin/env node

import { StateManager } from "./lib/state-manager";
import { Issue } from "./lib/types";

function formatIssueContext(issue: Issue): string {
  let context = `**Issue #${issue.issue_number}** (${
    issue.status ?? "unknown"
  })\n`;
  context += `- **Category**: ${issue.category}\n`;
  context += `- **Severity**: ${issue.severity ?? "not specified"}\n`;
  context += `- **Description**: ${issue.description}\n`;

  if (issue.file) {
    context += `- **Location**: ${issue.file}`;
    if (issue.line) {
      context += `:${issue.line}`;
    }
    context += "\n";
  }

  context += "\n";
  return context;
}

function generateActiveSection(activeIssues: Issue[]): string {
  if (activeIssues.length === 0) return "";

  let section = "### Active Issues to Re-evaluate\n\n";
  for (const issue of activeIssues) {
    section += formatIssueContext(issue);
  }
  return section;
}

function generateIgnoredSection(ignoredIssues: Issue[]): string {
  if (ignoredIssues.length === 0) return "";

  let section = "### Ignored Issues (for context only)\n\n";
  for (const issue of ignoredIssues) {
    section += formatIssueContext(issue);
  }
  return section;
}

function main() {
  try {
    const state = StateManager.load("state.json");

    if (state.issues.length === 0) {
      console.log("No previous issues found.");
      return "No previous issues found.";
    }

    const activeIssues = StateManager.getActiveIssues(state);
    const ignoredIssues = StateManager.filterByStatus(state, "ignored");

    let reviewContext = "";
    reviewContext += generateActiveSection(activeIssues);
    reviewContext += generateIgnoredSection(ignoredIssues);

    if (reviewContext === "") {
      reviewContext = "No previous issues found.";
    }

    console.log(
      `Prepared review context with ${activeIssues.length} active and ${ignoredIssues.length} ignored issues`
    );

    return reviewContext;
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    // Don't throw - just provide empty context
    return "No previous review found.";
  }
}

export { main };
