#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

interface ProcessedIssue {
  id: string;
  issue_number: number;
  status: 'new' | 'persisted' | 'resolved';
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
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatLocation(issue: ProcessedIssue): string {
  const loc = issue.file ?? '';
  if (issue.line) {
    return `${loc}:${issue.line}`;
  }
  return loc;
}

function generateIssueTable(issues: ProcessedIssue[]): string {
  let table = '| # | Severity | Category | Issue | Location |\n';
  table += '|---|----------|----------|-------|----------|\n';

  for (const issue of issues) {
    const sev = SEVERITY_EMOJI[issue.severity ?? ''] ?? '⚪';
    const desc = truncate(issue.description, 60);
    const loc = formatLocation(issue);

    table += `| **${issue.issue_number}** | ${sev} | ${issue.category} | ${desc} | ${loc} |\n`;
  }

  return table;
}

function main() {
  try {
    const state: State = JSON.parse(readFileSync('state.json', 'utf-8'));
    const encoded = readFileSync('state_encoded.txt', 'utf-8');

    const active = state.issues.filter(i => i.status !== 'resolved' && !i.ignored);
    const ignored = state.issues.filter(i => i.ignored);
    const resolved = state.issues.filter(i => i.status === 'resolved');

    let md = '## 🕵️‍♂️ Claude Review\n\n';

    if (active.length === 0) {
      md += '✅ **Approved**\n\n' + state.summary;
    } else {
      const newCount = active.filter(i => i.status === 'new').length;
      const persCount = active.filter(i => i.status === 'persisted').length;

      md += `**Summary:** ${state.summary}\n\n`;
      md += `**Issues:** ${active.length} active (${newCount} new, ${persCount} persisted)`;

      if (ignored.length > 0) {
        md += `, ${ignored.length} ignored`;
      }
      if (resolved.length > 0) {
        md += `, ${resolved.length} resolved ✅`;
      }
      md += '\n\n';

      md += '### Active Issues\n\n';
      md += generateIssueTable(active);
    }

    // Add collapsible resolved section
    if (resolved.length > 0) {
      md += '\n<details>\n';
      md += `<summary>✅ Resolved Issues (${resolved.length})</summary>\n\n`;
      md += generateIssueTable(resolved);
      md += '\n</details>\n';
    }

    // Add collapsible ignored section
    if (ignored.length > 0) {
      md += '\n<details>\n';
      md += `<summary>🙈 Ignored Issues (${ignored.length})</summary>\n\n`;
      md += generateIssueTable(ignored);
      md += '\n</details>\n';
    }

    md += `\n\n<!-- claude-review-results -->`;
    md += `\n<!-- state:${encoded} -->`;
    md += `\n<!-- sha:${state.review_sha} -->`;

    writeFileSync('summary.md', md);
    console.log('Generated markdown summary');

  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();