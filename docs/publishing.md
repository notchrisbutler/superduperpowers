# Publishing

SuperDuperPowers publishes through a restricted manual release workflow. The workflow validates `main`, computes the next calendar version, commits that version back to `main`, fast-forwards the protected `latest` published-state branch, creates a GitHub Release from `CHANGELOG.md`, and publishes the matching npm version to the `latest` dist-tag for the `superduperpowers` package.

OpenCode installs should use the npm package by default. GitHub `main` repository installs are fallback/nightly sources for power users who intentionally want repository-head behavior and can tolerate unreleased bugs. No PRs should target `latest`; it is promoted only by the restricted manual release workflow.

## Release Tags

Calendar release tags use:

```text
vYYYY.MMDD.N
```

GitHub Releases are the active release history. Tags use zero-padded `MMDD`, for example `vYYYY.MMDD.N`. npm `latest` is the stable OpenCode install channel and mirrors the protected `latest` branch.

The release and publish gates reject tags outside this format and reject GitHub prereleases because every automated publish updates npm `latest`. The protected npm trusted-publishing environment should allow only the `latest` branch and `v*` tags; it should not allow `main` directly.

## Release Preparation

Before running the restricted release workflow, prepare `main` through the normal PR/CI path. The release-prep PR should update `CHANGELOG.md` with the release notes, but it should not need to mention the next version because the workflow computes that version:

```bash
git diff latest...main
# update CHANGELOG.md to describe the unreleased changes
git add CHANGELOG.md
git commit -m "Update changelog for release"
```

The first release on a date uses `YYYY.MMDD.0`. Additional releases on the same date increment the final numeric segment, for example `YYYY.MMDD.1` and `YYYY.MMDD.2`.

You can also pass an explicit version:

```bash
scripts/bump-version.sh 2026.0506.0
scripts/bump-version.sh YYYY.MMDD.N
```

## Run The Restricted Release Workflow

Run the restricted manual release workflow after `main` is release-prepared and green. Start with the default dry run, then rerun with `dry_run` false only after approval:

```text
Source: main
Promotes: latest by fast-forward only
Version/tag: computed by npm run version:next
Release body: CHANGELOG.md
Publishes: npm latest from latest
```

`CHANGELOG.md` is the GitHub Release body source. The release gate requires `main` as the source, a non-empty `CHANGELOG.md`, an existing `latest` branch, and proof that `main` is not behind `latest`.

The release workflow validates `main`, runs `npm run version:next`, verifies the computed tag is unused, commits the version bump to `main`, fast-forwards `latest` to that commit, verifies `origin/latest` exactly equals the release commit, creates the GitHub Release from `latest`, and publishes npm from `latest`. It does not rewrite `CHANGELOG.md` or open PRs into `latest`.

Publishing uses the protected GitHub `npm` environment and npm trusted publishing. The package already exists on npm, so configure trusted publishing for repository `notchrisbutler/superduperpowers`, workflow file `release.yml`, and environment `npm`. There is no separate publish workflow; `Release latest` owns npm publishing end-to-end.

## Package Verification

Before publishing, verify the installer tests and package dry-run output:

```bash
tests/opencode/run-tests.sh --test test-installer-cli.sh
npm pack --dry-run
```

Confirm the dry-run package contents include the CLI and installer support directories (`bin/`, `installer/`, and `defaults/`) alongside the existing `skills/`, `agents/`, docs, and `.opencode/plugins/` OpenCode plugin files.

## Install Strings

The primary setup path is the npm CLI installer:

```bash
npx superduperpowers
```

The installer configures OpenCode to load the npm package:

Recommended plugin entry after install:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers"]
}
```

Fallback/nightly install from GitHub `main`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#main"]
}
```
