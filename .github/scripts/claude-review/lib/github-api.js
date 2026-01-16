#!/usr/bin/env node

export function getContextFromEnv() {
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.GITHUB_PR_NUMBER;

  if (!githubRepo || !prNumber) {
    throw new Error("ERROR: GITHUB_REPOSITORY or GITHUB_PR_NUMBER not set");
  }

  const [owner, repo] = githubRepo.split("/");
  return { owner, repo, prNumber };
}

export function formatLocation(issue, githubRepo, prNumber) {
  if (!issue.file) return "";

  const file = issue.file;
  const line = issue.line;

  // If there's a comment ID, link to the inline comment
  if (issue.comment_id) {
    const location = line ? `${file}:${line}` : file;
    return `[${location}](https://github.com/${githubRepo}/pull/${prNumber}#discussion_r${issue.comment_id})`;
  }

  // For file-level issues without inline comments, show location without link
  return line ? `${file}:${line}` : file;
}

export function buildInlineCommentBody(issue) {
  return `**Issue ${issue.issue_number}: ${issue.category}**\n\n${issue.description}\n\n**Suggested Fix:**\n${issue.suggested_fix}\n\n<!-- issue_number:${issue.issue_number} -->`;
}
