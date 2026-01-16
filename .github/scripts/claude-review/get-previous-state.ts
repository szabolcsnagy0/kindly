#!/usr/bin/env node

import { StateManager } from "./lib/state-manager";
import { State } from "./lib/types";
import { GitHubAPI, GitHubScriptContext } from "./lib/github-api";

interface PreviousState {
  state: State;
  previous_sha: string;
}

async function main(
  github: GitHubAPI,
  context: GitHubScriptContext
): Promise<PreviousState> {
  try {
    const prNumber = process.env.GITHUB_PR_NUMBER;
    if (!prNumber) {
      console.error("ERROR: GITHUB_PR_NUMBER not set");
      return {
        state: StateManager.createEmpty(),
        previous_sha: "",
      };
    }

    const comments = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
    });

    // Find last comment by bot that contains state
    const botComments = comments.data
      .filter((c) => c.user.type === "Bot" && c.body.includes("<!-- state:"))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    const botComment = botComments.length > 0 ? botComments[0] : null;

    if (!botComment) {
      console.log("No previous state found");
      return {
        state: StateManager.createEmpty(),
        previous_sha: "",
      };
    }

    // Extract state marker
    const match = botComment.body.match(/<!-- state:([A-Za-z0-9+/=]+) -->/);
    if (!match) {
      console.log("No state marker found in comment");
      return {
        state: StateManager.createEmpty(),
        previous_sha: "",
      };
    }

    try {
      const state = await StateManager.decode(match[1]);

      console.log(`Loaded previous state from SHA ${state.review_sha}`);
      console.log(`Previous state has ${state.issues.length} issues`);

      return {
        state,
        previous_sha: state.review_sha,
      };
    } catch (error) {
      console.error(
        `Failed to parse previous state: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        state: StateManager.createEmpty(),
        previous_sha: "",
      };
    }
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      state: StateManager.createEmpty(),
      previous_sha: "",
    };
  }
}

export { main };
