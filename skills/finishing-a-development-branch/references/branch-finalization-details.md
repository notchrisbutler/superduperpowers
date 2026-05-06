# Branch Finalization Details

Use this reference when the inline branch-finalization gates are not enough.

## Preparing Main For Release Promotion

When the branch being finalized is `main` and the next step is promotion to `latest`, compare `latest...main` and rewrite `CHANGELOG.md` by default before calling `main` release-ready. Keep the existing changelog prose and section style, cite validation evidence, and do not invent or insert the next version. If the project has no versioning schema, identify release notes with commit IDs or the `latest...main` branch comparison string. The restricted release workflow computes the version, commits it to `main`, promotes `latest`, creates the GitHub Release, and publishes npm.

## Option 1: Merge Temporary Branch Into Parent/Source

Use only when finishing from a worktree or temporary task branch.

```bash
git checkout <target-local-branch>
git merge <completed-work-branch>
<test command>
git branch -d <completed-work-branch>
```

Clean up the worktree only after the merge result is verified. If finishing from a durable feature branch, do not merge anywhere; report readiness and wait for push/PR instructions.

## Option 2: Prepare PR Summary and Commands

Do not push automatically. Provide commands for the user to run unless they explicitly ask you to push.

```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <what changed>
- <why it matters>

## Closes
<!-- Omit if no GitHub issue is fully resolved. -->
Closes #<issue-number>

## Test Plan
- [ ] <verification evidence>
EOF
)"
```

Use `Closes`, `Fixes`, or `Resolves` only when the branch fully resolves an issue. Mention partial issue work without a closing keyword.

## Option 3: Keep As-Is

Report the branch and any worktree path. Do not clean up worktrees or temporary branches.

## Option 4: Discard

Confirm first:

```text
This will permanently delete:
- Temporary branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Proceed only after exact confirmation.

```bash
git checkout <base-branch>
git branch -D <temporary-branch>
git worktree remove <worktree-path>
```

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge temp branch | temp -> parent/source | no | no after verified merge | temp only |
| 2. Prepare PR | no | user-run | ask | ask |
| 3. Keep as-is | no | no | yes | no |
| 4. Discard | no | no | no after confirmation | temp only after confirmation |

## Common Mistakes

- Skipping verification: run `verification-before-completion` and verify merged results.
- Leaving workflow work uncommitted: commit locally only when approved workflow commits are enabled.
- Asking open-ended questions: use the 4-option prompt when a decision is needed.
- Automatic cleanup after PR prep: ask first.
- Treating a normal feature branch like a worktree: report readiness instead.
- Merging temporary branches to default branch by assumption: use recorded parent/source or ask.
- Discarding without typed confirmation: never do this.
