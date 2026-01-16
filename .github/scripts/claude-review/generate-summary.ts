#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { State, Issue, CONFIG, SEVERITY_EMOJI } from "./lib/types";
import { getContextFromEnv, formatLocation } from "./lib/github-api";
import { StateManager } from "./lib/state-manager";

interface PreparedIssues {
  displayed: Issue[];
  hiddenCount: number;
}

function sortIssuesBySeverity(issues: Issue[]): Issue[] {
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...issues].sort((a, b) => {
    const severityDiff =
      severityOrder[a.severity ?? "low"] - severityOrder[b.severity ?? "low"];
    if (severityDiff !== 0) return severityDiff;
    return (a.issue_number ?? 0) - (b.issue_number ?? 0);
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function prepareIssuesForDisplay(
  issues: Issue[],
  maxDisplay: number
): PreparedIssues {
  const sorted = sortIssuesBySeverity(issues);
  return {
    displayed: sorted.slice(0, maxDisplay),
    hiddenCount: Math.max(0, issues.length - maxDisplay),
  };
}

function generateIssueTable(
  issues: Issue[],
  githubRepo: string,
  prNumber: string,
  truncateDescriptions = false
): string {
  let table = "| # | Category | Issue | Location |\n";
  table += "|---|----------|-------|----------|\n";

  for (const issue of issues) {
    const sev = SEVERITY_EMOJI[issue.severity ?? "low"];
    const category = `${sev} ${issue.category}`;

    // Only truncate issues that have inline comments
    const shouldTruncate =
      truncateDescriptions && issue.comment_id !== undefined;
    const desc = shouldTruncate
      ? truncateText(issue.description, CONFIG.VISIBLE_DESC_LIMIT)
      : issue.description;
    const loc = formatLocation(issue, githubRepo, prNumber);

    table += `| **${issue.issue_number}** | ${category} | ${desc} | ${loc} |\n`;
  }

  return table;
}

function generateActiveSection(
  active: Issue[],
  githubRepo: string,
  prNumber: string,
  truncateDescriptions: boolean
): string {
  const { displayed, hiddenCount } = prepareIssuesForDisplay(
    active,
    CONFIG.MAX_DISPLAYED_ACTIVE
  );

  let md = "";
  if (hiddenCount > 0) {
    md += `> ⚠️ *Showing top ${CONFIG.MAX_DISPLAYED_ACTIVE} of ${active.length} active issues.*\n\n`;
  }

  md += "### Active Issues\n\n";
  md += generateIssueTable(
    displayed,
    githubRepo,
    prNumber,
    truncateDescriptions
  );
  return md;
}

function generateCollapsibleSection(
  issues: Issue[],
  title: string,
  maxDisplay: number,
  githubRepo: string,
  prNumber: string,
  truncateDescriptions: boolean
): string {
  if (issues.length === 0) return "";

  const { displayed, hiddenCount } = prepareIssuesForDisplay(
    issues,
    maxDisplay
  );

  let md = "\n<details>\n";
  md += `<summary>${title} (${issues.length})`;
  if (hiddenCount > 0) {
    md += ` - showing ${maxDisplay}`;
  }
  md += `</summary>\n\n`;
  md += generateIssueTable(
    displayed,
    githubRepo,
    prNumber,
    truncateDescriptions
  );
  md += "\n</details>\n";
  return md;
}

function generateSummaryHeader(
  active: Issue[],
  ignored: Issue[],
  resolved: Issue[]
): string {
  let md = "## 🕵️‍♂️ Claude Review\n\n";

  if (active.length === 0) {
    md += "✅ **Approved**\n\n";
  } else {
    const newCount = active.filter((i) => i.status === "new").length;
    const persCount = active.filter((i) => i.status === "persisted").length;

    md += `**Issues:** ${active.length} active (${newCount} new, ${persCount} persisted)`;

    if (ignored.length > 0) {
      md += `, ${ignored.length} ignored`;
    }
    if (resolved.length > 0) {
      md += `, ${resolved.length} resolved`;
    }
    md += "\n\n";

    md +=
      "> **To ignore issues:** Post a comment with `claude-ignore <numbers>` (e.g., `claude-ignore 3` or `claude-ignore 1,2,3`).\n\n";
  }

  return md;
}

function generateMarkdown(
  state: State,
  encoded: string,
  githubRepo: string,
  prNumber: string,
  truncateDescriptions = false
): string {
  const active = StateManager.getActiveIssues(state);
  const ignored = StateManager.filterByStatus(state, "ignored");
  const resolved = StateManager.filterByStatus(state, "resolved");

  let md = generateSummaryHeader(active, ignored, resolved);

  if (active.length > 0) {
    md += generateActiveSection(
      active,
      githubRepo,
      prNumber,
      truncateDescriptions
    );
  }

  md += generateCollapsibleSection(
    resolved,
    "Resolved Issues",
    CONFIG.MAX_DISPLAYED_RESOLVED,
    githubRepo,
    prNumber,
    truncateDescriptions
  );

  md += generateCollapsibleSection(
    ignored,
    "Ignored Issues",
    CONFIG.MAX_DISPLAYED_IGNORED,
    githubRepo,
    prNumber,
    truncateDescriptions
  );

  md += `\n\n<!-- claude-review-results -->`;
  md += `\n<!-- state:${encoded} -->`;
  md += `\n<!-- sha:${state.review_sha} -->`;

  return md;
}

function estimateSize(state: State, encodedState: string): number {
  const encodedSize = encodedState.length;
  const issuesSize = state.issues.reduce(
    (sum, i) => sum + (i.description?.length ?? 0) + 200, // 200 per issue for formatting overhead
    1000 // base overhead for headers and structure
  );
  return encodedSize + issuesSize;
}

function main() {
  try {
    const { owner, repo, prNumber } = getContextFromEnv();
    const githubRepo = `${owner}/${repo}`;

    const state = StateManager.load("state.json");
    const encoded = readFileSync("state_encoded.txt", "utf-8");

    // Check if truncation is needed before generating
    const shouldTruncate = estimateSize(state, encoded) > CONFIG.TRUNCATE_THRESHOLD;
    const md = generateMarkdown(
      state,
      encoded,
      githubRepo,
      prNumber,
      shouldTruncate
    );

    console.log(`Comment size: ${md.length} characters`);

    if (md.length > CONFIG.TRUNCATE_THRESHOLD) {
      console.log(
        `Warning: Comment size (${md.length}) exceeds threshold (${CONFIG.TRUNCATE_THRESHOLD}). ` +
          `Size estimation may need adjustment.`
      );
    }

    writeFileSync("summary.md", md);
    console.log("Generated markdown summary");
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
