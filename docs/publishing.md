# Publishing

SuperDuperPowers publishes through GitHub Releases. OpenCode installs should use the moving `latest` Git tag for the current recommended release, or a concrete calendar-version tag for reproducible installs.

There is no npm publication flow for this project.

## Release Tags

Calendar release tags use:

```text
YYYY.M.D
YYYY.M.D-N
```

The `latest` tag should point at the same commit as the current recommended stable release.

## Local Version Bump

Before creating a release, bump the version locally and push the result to `main`:

```bash
scripts/bump-version.sh --next
scripts/bump-version.sh --check
scripts/bump-version.sh --audit
git add package.json README.md
VERSION=$(node -p "require('./package.json').version")
git commit -m "Release ${VERSION}"
git push origin main
```

The first release on a date uses `YYYY.M.D`. Additional releases on the same date use suffixes such as `YYYY.M.D-1`, `YYYY.M.D-2`, and so on. Do not use leading zeroes such as `YYYY.04.DD`.

You can also pass an explicit version:

```bash
scripts/bump-version.sh 2026.5.1
scripts/bump-version.sh 2026.5.1-1
```

## Create The GitHub Release

Create the GitHub Release:

```text
Tag: YYYY.M.D or YYYY.M.D-N
Release title: YYYY.M.D or YYYY.M.D-N
Target: main
```

Use `docs/superduperpowers/other/release-notes.md` as the release body when preparing the release.

## Move The latest Tag

After the GitHub Release is ready, move the `latest` tag to the same commit and push it:

```bash
git tag -f latest VERSION
git push origin latest --force
```

Replace `VERSION` with the calendar release tag, such as `2026.5.5`.

## Install Strings

Recommended moving install:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#latest"]
}
```

Pinned install:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#2026.5.5"]
}
```
