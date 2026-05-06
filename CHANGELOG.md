This patch simplifies the release path into a single restricted workflow that owns validation, versioning, branch promotion, GitHub Release creation, and npm publishing.

The release preparation model now keeps `main` easier to merge into: release-prep PRs update `CHANGELOG.md` with human release notes, while the workflow computes the next version at release time.

## Highlights

- `Release latest` is now a multi-job pipeline: validate, promote, create the GitHub Release, then publish npm.
- The workflow runs `npm run version:next`, commits the generated version back to `main`, and fast-forwards `latest` to the release commit.
- GitHub Releases are created from the `latest` branch with `CHANGELOG.md` as the release body.
- npm publishing now happens directly in the release workflow from `latest`, avoiding suppressed downstream workflow triggers.
- The separate `publish.yml` workflow was removed so `Release latest` is the only workflow that can publish npm.
- Release gates now require a non-empty `CHANGELOG.md` without requiring the changelog to mention the workflow-generated version.

## Release Flow

The intended path is now:

- Merge feature work to `main` through normal PR validation.
- Merge a final `CHANGELOG.md` update to `main` that describes the release contents without naming the next version.
- Run `Release latest` as a dry run first.
- Run `Release latest` for real after approval.

The real release run then:

- validates that `main` can fast-forward `latest`
- computes the next `YYYY.MMDD.N` package version
- checks version metadata, release policy, package contents, and OpenCode tests
- commits the version bump to `main`
- fast-forwards `latest` to the new `main` commit
- creates the `vYYYY.MMDD.N` GitHub Release from `latest`
- publishes the package to npm with the `latest` dist-tag

## Publishing Guardrails

The npm publish step remains behind the protected GitHub `npm` environment and uses npm trusted publishing from `.github/workflows/release.yml`.

The release workflow verifies that the package version, release tag, `origin/latest`, and release commit all agree before publishing. It also runs `npm publish --dry-run` immediately before the real publish.

The old separate publish workflow was removed. Package dry-run validation now lives inside `Release latest`, immediately before the real npm publish step.

## Documentation And Policy

Release documentation now describes changelog-only release preparation on `main` and workflow-owned version generation. The finishing-branch guidance tells agents not to invent or insert the next version in `CHANGELOG.md`; the restricted release workflow is responsible for choosing and committing it.

Workflow policy tests now guard the new shape so future changes do not reintroduce downstream publish dispatches or changelog version requirements.
