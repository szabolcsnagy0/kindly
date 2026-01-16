#!/usr/bin/env node

import { readFileSync } from "fs";

async function findResultsComment(github, context, prNumber) {
  const marker = "<!-- claude-review-results -->";

  const comments = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  const resultsComment = comments.data.find(
    (c) => c.user.type === "Bot" && c.body.includes(marker)
  );

  if (resultsComment) {
    console.log(`Found existing results comment: ${resultsComment.id}`);
    return String(resultsComment.id);
  }

  console.log("No results comment found");
  return null;
}

export async function main(github, context, runningCommentId, runId, hasChanges) {
  try {
    const prNumber = process.env.GITHUB_PR_NUMBER;
    if (!prNumber) {
      console.error("ERROR: GITHUB_PR_NUMBER not set");
      process.exit(1);
    }

    const summaryMd = readFileSync("summary.md", "utf-8");
    const resultsCommentId = await findResultsComment(
      github,
      context,
      prNumber
    );

    if (!resultsCommentId) {
      // First run: Convert running comment to results comment
      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: runningCommentId,
        body: summaryMd,
      });
      console.log("Updated running comment with results (first run)");
    } else {
      // Subsequent runs: Update results comment
      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: resultsCommentId,
        body: summaryMd,
      });
      console.log("Updated results comment");

      // Update running comment with link
      const linkBody = hasChanges
        ? `## ✅ Claude Review Complete\n\nReview finished successfully! See the [results comment](https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${prNumber}#issuecomment-${resultsCommentId}).\n\n[View workflow run](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId})`
        : `## ✅ Claude Review Complete\n\nNo changes detected since the last review.\n\nSee the [results comment](https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${prNumber}#issuecomment-${resultsCommentId}).`;

      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: runningCommentId,
        body: linkBody,
      });
      console.log("Updated running comment with link");
    }
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
