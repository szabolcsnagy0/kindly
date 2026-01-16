#!/usr/bin/env node

import { existsSync } from "fs";
import { StateManager } from "./lib/state-manager.js";
import { buildInlineCommentBody } from "./lib/github-api.js";

export async function main(github, context, headSha) {
  try {
    const prNumber = process.env.GITHUB_PR_NUMBER;
    if (!prNumber) {
      console.error("ERROR: GITHUB_PR_NUMBER not set");
      process.exit(1);
    }

    const state = StateManager.load("state.json");

    // Filter for new line-specific issues with existing files
    const newLineIssues = state.issues.filter((i) => {
      if (i.status !== "new" || !i.line || !i.file) return false;
      return existsSync(i.file);
    });

    if (newLineIssues.length === 0) {
      console.log("No new line-specific issues to comment on");
      return;
    }

    console.log(`Found ${newLineIssues.length} new line-specific issues`);

    // Get list of changed files in the PR
    const filesResponse = await github.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
    });
    const changedFiles = new Set(filesResponse.data.map((f) => f.filename));

    // Only comment on files that are actually in the PR
    const validatedIssues = newLineIssues.filter((i) =>
      i.file ? changedFiles.has(i.file) : false
    );

    if (validatedIssues.length === 0) {
      console.log("No valid issues to comment on after validation");
      return;
    }

    console.log(`Posting ${validatedIssues.length} inline comments`);

    let successCount = 0;

    for (const issue of validatedIssues) {
      if (!issue.file || !issue.line) continue;

      const body = buildInlineCommentBody(issue);

      try {
        const response = await github.rest.pulls.createReviewComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: prNumber,
          commit_id: headSha,
          path: issue.file,
          line: issue.line,
          side: "RIGHT",
          body: body,
        });

        issue.comment_id = response.data.id;
        successCount++;
      } catch (error) {
        console.error(
          `Failed to comment on ${issue.file}:${issue.line} - ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Save updated state with comment IDs
    StateManager.save(state, "state.json");
    console.log(
      `Successfully posted ${successCount}/${validatedIssues.length} comments`
    );
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
