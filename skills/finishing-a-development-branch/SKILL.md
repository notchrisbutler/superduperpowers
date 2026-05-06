---
name: finishing-a-development-branch
description: Use when implementation is complete, tests have been verified, and local branch or worktree completion needs an explicit next-step decision.
metadata:
  category: completion
---

# Finishing a Development Branch

## Overview

Guide completion of development work by choosing the correct local context before presenting next-step options.

**Core principle:** Verify with evidence, preserve approved local commit boundaries when workflow commits are enabled, identify durable branch vs temporary worktree branch, present local-first options, and execute the user's choice.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

Before claiming implementation is complete, invoke `verification-before-completion` as the final evidence gate. This skill handles branch/worktree decisions; verification detail belongs to `verification-before-completion`.

## When to Use

Use after implementation and validation are complete and the user or workflow needs a local branch/worktree finalization decision. Do not use it to prove correctness; run `verification-before-completion` first.

## Process

### Step 1: Verify Completion Evidence

Run `verification-before-completion` before presenting options, committing, merging, preparing a PR, or claiming readiness. If verification fails, report the actual failures and stop.

### Step 2: Commit Verified Local Work When Enabled

If workflow commits are enabled by an approved execution workflow and verified implementation changes remain uncommitted, create a local commit before completion options. Ordinary sessions must not commit unasked.

Do not commit unrelated user changes, ignored secrets, or local-only generated files. If unrelated changes are mixed and cannot be safely separated, stop and ask. Do not push unless explicitly requested.

When preparing `main` for release promotion to `latest`, treat `CHANGELOG.md` finalization as part of making `main` release-ready. Before declaring readiness, compare `latest...main`, rewrite `CHANGELOG.md` by default to summarize the unreleased changes, preserve the file's current prose and section style, and include validation evidence in the final report. If the project has no versioning schema, use commit IDs or the `latest...main` branch comparison string instead of inventing a version. This guidance prepares `main`; the restricted release workflow itself validates release readiness and must not rewrite the changelog.

### Step 3: Determine Completion Context

Determine whether work is already on the user's durable branch or on a temporary worktree/task branch that must be integrated elsewhere. Use the workflow profile or active harness context for execution method, parent/source branch, selected durable branch, and worktree paths. Do not rely on memory or brittle shell pipelines when profile data exists.

Integration target priority:

1. Explicit user instruction from this session.
2. Recorded parent/source branch used to spawn the worktree.
3. Current durable feature branch when no worktree/task branch is involved.
4. Ask the user; do not guess `main`/`master`.

Never infer `main`/`master` as the merge target just because it is the default branch.

### Step 4: Present Options Only When Needed

If work is already committed on the user-directed durable branch, do not offer local merge or cleanup prompts. Report branch, commit(s), and verification evidence, then leave push/PR creation to the user unless explicitly requested.

If a worktree, temporary task branch, uncommitted work, or discard decision requires user choice, present exactly:

```text
Implementation complete. What would you like to do?

1. Merge temporary branch into parent/source branch locally
2. Prepare Pull Request summary and commands (you push when ready)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

Keep the options concise.

### Step 5: Execute the Choice Safely

- **Option 1:** Use only for a worktree or temporary task branch. Merge into the recorded parent/source branch unless the user explicitly selected a different local target. Verify the merged result before cleanup. Do not merge temporary branches directly to `main`/`master` unless that was the explicit parent/source target.
- **Option 2:** Do not push automatically. Prepare PR summary and exact user-run commands. Include closing keywords only for fully resolved tracked issues. Ask before cleaning up local worktrees or temporary task branches; if none exist, do not ask cleanup questions.
- **Option 3:** Keep branch/worktree as-is and report preserved paths.
- **Option 4:** Require exact typed confirmation such as `discard` before deleting any temporary branch, commits, or worktree. Never discard without confirmation.

### Step 6: Cleanup Decision Gates

- Options 1 and 4: clean up completed temporary worktrees/branches only after merged-result verification or typed discard confirmation.
- Option 2: ask before cleanup; the user may want local state until after pushing/opening the PR.
- Option 3: keep worktrees and branches.
- Never delete the durable feature branch the user will push or use for PR creation.

## Red Flags

Never:

- Proceed with failing or missing verification evidence.
- Merge without verifying the merged result.
- Push, force-push, or create remote changes without explicit request.
- Delete work without typed confirmation.
- Merge to `main`/`master` unless the user explicitly requested that integration target.
- Delete a durable feature branch while finalizing temporary worktree branches.

Always:

- Run `verification-before-completion` before success claims or completion options.
- Identify durable branch vs temporary worktree/task branch before presenting options.
- Commit verified local implementation work only when workflow commits are enabled by an approved execution workflow.
- Present the 4-option prompt only when a decision is needed.
- Use profile/harness context for worktree paths and cleanup decisions.

For extended examples/details, read [branch finalization details](references/branch-finalization-details.md) when this extra detail is needed.

## Integration

Called by `subagent-driven-development` and `executing-plans` after all work is complete. Pairs with `using-git-worktrees` for cleanup of worktrees created by that skill.
