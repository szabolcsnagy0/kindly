#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { StateManager } from "./lib/state-manager.js";
import { getContextFromEnv, formatLocation } from "./lib/github-api.js";

const CONFIG = {
  TRUNCATE_THRESHOLD: 60_000,
  VISIBLE_DESC_LIMIT: 150,
  MAX_DISPLAYED_ACTIVE: 50,
  MAX_DISPLAYED_RESOLVED: 25,
  MAX_DISPLAYED_IGNORED: 25,
};

const SEVERITY_EMOJI = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

function sortIssuesBySeverity(issues) {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return [...issues].sort((a, b) => {
    const severityDiff =
      severityOrder[a.severity ?? "low"] - severityOrder[b.severity ?? "low"];
    if (severityDiff !== 0) return severityDiff;
    return (a.issue_number ?? 0) - (b.issue_number ?? 0);
  });
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function prepareIssuesForDisplay(issues, maxDisplay) {
  const sorted = sortIssuesBySeverity(issues);
  return {
    displayed: sorted.slice(0, maxDisplay),
    hiddenCount: Math.max(0, issues.length - maxDisplay),
  };
}

function generateIssueTable(
  issues,
  githubRepo,
  prNumber,
  truncateDescriptions = false
) {
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
  active,
  githubRepo,
  prNumber,
  truncateDescriptions
) {
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
  issues,
  title,
  maxDisplay,
  githubRepo,
  prNumber,
  truncateDescriptions
) {
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

function generateSummaryHeader(active, ignored, resolved) {
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
  state,
  encoded,
  githubRepo,
  prNumber,
  truncateDescriptions = false
) {
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

function estimateSize(state, encodedState) {
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
