#!/usr/bin/env node

import { StateManager } from "./lib/state-manager";
import { GitHubAPI, GitHubScriptContext } from "./lib/github-api";

// Matches 'claude-ignore' at start of string or start of line
const IGNORE_REGEX = /(?:^|\n)\s*claude-ignore\s+([\d,\s]+)/i;

function parseIgnoreCommand(text: string): number[] {
  const match = text.match(IGNORE_REGEX);
  if (!match) return [];

  return match[1]
    .split(/[,\s]+/)
    .map((n) => parseInt(n.trim()))
    .filter((n) => !isNaN(n));
}

async function scanPRComments(
  github: GitHubAPI,
  context: GitHubScriptContext,
  prNumber: string
): Promise<Set<number>> {
  const ignoredIssueNumbers = new Set<number>();

  const allComments = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  for (const comment of allComments.data) {
    const numbers = parseIgnoreCommand(comment.body);
    if (numbers.length > 0) {
      console.log(
        `Found ignore command in comment ${comment.id}: ${numbers.join(", ")}`
      );
      numbers.forEach((num) => ignoredIssueNumbers.add(num));
    }
  }

  return ignoredIssueNumbers;
}

async function scanReviewThreads(
  github: GitHubAPI,
  context: GitHubScriptContext,
  prNumber: string
): Promise<Set<number>> {
  const ignoredIssueNumbers = new Set<number>();

  try {
    const pr = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
    });

    const queryData = await github.graphql(
      `
        query($prNodeId: ID!) {
          node(id: $prNodeId) {
            ... on PullRequest {
              reviewThreads(last: 100) {
                nodes {
                  id
                  comments(last: 50) {
                    nodes {
                      id
                      body
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { prNodeId: pr.data.node_id }
    );

    const threads = queryData?.node?.reviewThreads?.nodes ?? [];

    for (const thread of threads) {
      for (const comment of thread.comments.nodes) {
        const numbers = parseIgnoreCommand(comment.body);
        if (numbers.length > 0) {
          console.log(
            `Found ignore command in thread comment: ${numbers.join(", ")}`
          );
          numbers.forEach((num) => ignoredIssueNumbers.add(num));
        }
      }
    }
  } catch (error) {
    console.error(
      `Failed to scan review threads: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return ignoredIssueNumbers;
}

async function main(github: GitHubAPI, context: GitHubScriptContext) {
  try {
    const prNumber = process.env.GITHUB_PR_NUMBER;
    if (!prNumber) {
      console.error("ERROR: GITHUB_PR_NUMBER not set");
      process.exit(1);
    }

    const state = StateManager.load("state.json");
    console.log(`Checking for ignore commands (${state.issues.length} issues)`);

    // Scan both PR comments and review threads
    const [prIgnored, threadIgnored] = await Promise.all([
      scanPRComments(github, context, prNumber),
      scanReviewThreads(github, context, prNumber),
    ]);

    const ignoredIssueNumbers = new Set([...prIgnored, ...threadIgnored]);

    // Apply ignore status
    const validIssueNumbers = state.issues
      .map((i) => i.issue_number)
      .filter((n): n is number => n !== undefined);
    const validIgnored = Array.from(ignoredIssueNumbers).filter((n) =>
      validIssueNumbers.includes(n)
    );

    if (validIgnored.length > 0) {
      console.log(
        `Marking issues as ignored: ${validIgnored
          .sort((a, b) => a - b)
          .join(", ")}`
      );

      for (const issue of state.issues) {
        if (issue.issue_number && validIgnored.includes(issue.issue_number)) {
          issue.status = "ignored";
        }
      }

      StateManager.save(state, "state.json");
      console.log("Updated state with ignored issues");
    } else {
      console.log("No new ignored issues found");
    }
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

export { main };
