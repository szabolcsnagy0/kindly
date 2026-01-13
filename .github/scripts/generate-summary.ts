#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";

interface ProcessedIssue {
  id: string;
  issue_number: number;
  status: "new" | "persisted" | "resolved";
  severity?: string;
  category: string;
  description: string;
  file?: string;
  line?: number;
  ignored: boolean;
  ignored_at?: string | null;
}

interface State {
  review_sha: string;
  summary: string;
  issues: ProcessedIssue[];
}

const SEVERITY_EMOJI: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function diffHash(filePath: string): string {
  return createHash("sha1").update(filePath).digest("hex");
}

function formatLocation(
  issue: ProcessedIssue,
  githubRepo: string,
  prNumber: string
): string {
  if (!issue.file) return "";

  const file = issue.file;
  const hash = diffHash(file);

  if (!issue.line) {
    return `[${file}](https://github.com/${githubRepo}/pull/${prNumber}/files#diff-${hash})`;
  }

  const line = issue.line;
  return `[${file}:${line}](https://github.com/${githubRepo}/pull/${prNumber}/files#diff-${hash}R${line})`;
}

function generateIssueTable(
  issues: ProcessedIssue[],
  githubRepo: string,
  prNumber: string
): string {
  let table = "| # | Severity | Category | Issue | Location |\n";
  table += "|---|----------|----------|-------|----------|\n";

  for (const issue of issues) {
    const sev = SEVERITY_EMOJI[issue.severity ?? ""] ?? "⚪";
    const desc = truncate(issue.description, 60);
    const loc = formatLocation(issue, githubRepo, prNumber);

    table += `| **${issue.issue_number}** | ${sev} | ${issue.category} | ${desc} | ${loc} |\n`;
  }

  return table;
}

function main() {
  try {
    const githubRepo = process.env.GITHUB_REPOSITORY;
    const prNumber = process.env.GITHUB_PR_NUMBER;

    if (!githubRepo || !prNumber) {
      console.error("ERROR: GITHUB_REPOSITORY or GITHUB_PR_NUMBER not set");
      process.exit(1);
    }

    const state: State = JSON.parse(readFileSync("state.json", "utf-8"));
    const encoded = readFileSync("state_encoded.txt", "utf-8");

    const active = state.issues.filter(
      (i) => i.status !== "resolved" && !i.ignored
    );
    const ignored = state.issues.filter((i) => i.ignored);
    const resolved = state.issues.filter((i) => i.status === "resolved");

    let md = "## 🕵️‍♂️ Claude Review\n\n";

    if (active.length === 0) {
      md += "✅ **Approved**\n\n" + state.summary;
    } else {
      const newCount = active.filter((i) => i.status === "new").length;
      const persCount = active.filter((i) => i.status === "persisted").length;

      md += `**Summary:** ${state.summary}\n\n`;
      md += `**Issues:** ${active.length} active (${newCount} new, ${persCount} persisted)`;

      if (ignored.length > 0) {
        md += `, ${ignored.length} ignored`;
      }
      if (resolved.length > 0) {
        md += `, ${resolved.length} resolved ✅`;
      }
      md += "\n\n";

      md += "### Active Issues\n\n";
      md += generateIssueTable(active, githubRepo, prNumber);
    }

    // Add collapsible resolved section
    if (resolved.length > 0) {
      md += "\n<details>\n";
      md += `<summary>✅ Resolved Issues (${resolved.length})</summary>\n\n`;
      md += generateIssueTable(resolved, githubRepo, prNumber);
      md += "\n</details>\n";
    }

    // Add collapsible ignored section
    if (ignored.length > 0) {
      md += "\n<details>\n";
      md += `<summary>🙈 Ignored Issues (${ignored.length})</summary>\n\n`;
      md += generateIssueTable(ignored, githubRepo, prNumber);
      md += "\n</details>\n";
    }

    md += `\n\n<!-- claude-review-results -->`;
    md += `\n<!-- state:${encoded} -->`;
    md += `\n<!-- sha:${state.review_sha} -->`;

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
