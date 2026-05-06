**SuperDuperPowers 2026.0506.4** focuses on release workflow hardening, SemVer-safe calendar versions, protected published-state promotion, tighter package contents, and flatter SuperDuperPowers orchestration.

This release moves publishing authority away from ordinary `main` branch activity. `main` remains the nightly/prerelease integration branch, while `latest` is the protected branch that matches the current GitHub Release and npm `latest` package.

## Highlights

- Release versions now use SemVer-safe CalVer in the form `YYYY.MMDD.N`, with GitHub tags in the form `vYYYY.MMDD.N`.
- A protected `latest` branch now represents the code published to GitHub Releases and npm `latest`.
- A restricted manual release workflow promotes already-prepared `main` to `latest`, creates the GitHub Release from `CHANGELOG.md`, and leaves npm publishing to the release-triggered publish workflow.
- Release gates reject PRs into `latest`, require linear `main` to `latest` promotion, check version/tag/changelog consistency, and fail before publishing if release state is uneven.
- The npm environment now allows deployments only from the `latest` branch and `v*` tags.
- Canonical workflow sources are model-agnostic, with OpenCode-specific wording only where the included harness adapter needs it.
- Subagents and fallback prompts now preserve flat orchestration: workers and reviewers report recommendations to the main coordinator instead of dispatching nested subagents.

## Release Branch And Publish Flow

Release automation now separates integration from published state:

- Feature branches merge into `main` through normal PR validation.
- `main` is the default nightly/prerelease branch and can carry unreleased work without forcing every contributor to resolve version bumps.
- Release managers prepare `main` by updating the package version and rewriting `CHANGELOG.md` before promotion.
- The manual `.github/workflows/release.yml` workflow validates `main`, fast-forwards `latest`, verifies `latest` points at the validated release commit, then creates `vYYYY.MMDD.N` using `CHANGELOG.md` as the release body.
- `.github/workflows/publish.yml` publishes to npm only from non-prerelease GitHub Release events whose tag, `package.json`, and `origin/latest` commit match.

The release workflow does not bump versions, rewrite changelogs, commit to `main`, push `main`, or accept PRs into `latest`.

## Versioning And Release Gates

Version tooling now enforces the new calendar version policy:

- `scripts/bump-version.sh` accepts exact `YYYY.MMDD.N` package versions and computes `--next` from `vYYYY.MMDD.N` tags.
- `scripts/release-gate.mjs` validates PR and release contexts, blocks PRs into `latest`, verifies `main` is not behind `latest`, compares package versions across branches, and checks the release tag/body before promotion.
- Release checks reject impossible calendar dates, existing tags/releases, stale changelog version text, and release tags that do not match the checked-out package version.
- CI now runs release-gate validation alongside workflow policy, agent/skill drift, installer, full OpenCode tests, and package dry-run checks.

## Package And Source Cleanup

The npm package allowlist is slimmer and more intentional:

- Runtime and OpenCode adapter files remain included: plugin files, installer, defaults, templates, assets, skills, agents, and required public docs.
- Local/generated/project-maintenance content is excluded: `docs/superduperpowers/`, `tests/`, `evals/`, `.github/`, `AGENTS.md`, and root `superduperpowers.config.jsonc`.
- The vendor-specific skill-writing resource was removed, and active workflow/package sources now avoid model-provider-specific guidance.

## Workflow Behavior

SuperDuperPowers workflow guidance now better supports long-running and resumed work:

- Fresh sessions that execute or resume approved work must use an explicit plan path or an approved plan path recorded in the workflow profile or handoff context.
- If no approved plan path is present, agents ask for the path or route back to planning instead of improvising from memory.
- `finishing-a-development-branch` now documents release-prep changelog behavior for `main` to `latest`: rewrite `CHANGELOG.md` from `latest...main`, include validation evidence, and fall back to commit IDs or the branch comparison string when no versioning schema exists.
- Dispatching, TDD, planning, brainstorming, review, and fallback prompts now state that subagents do not spawn, dispatch, or coordinate subagents of their own.

## Validation

Verified locally:

```bash
npm run version:check
npm run version:audit
tests/opencode/test-workflow-policy.sh
tests/opencode/test-agent-skill-drift.sh
tests/opencode/test-installer-cli.sh
tests/opencode/run-tests.sh
node --check scripts/release-gate.mjs
bash -n scripts/bump-version.sh
npm pack --dry-run --json
```

`tests/opencode/run-tests.sh` passed all 9 non-integration OpenCode tests. Integration tests were not run by default; use `tests/opencode/run-tests.sh --integration` when OpenCode runtime behavior needs live validation.
