# SuperDuperPowers - Contributor Notes

SuperDuperPowers is an alpha skills and reviewer-agents plugin. Keep changes focused on slim packaging, harness-agnostic workflow sources, the included OpenCode config, marketplace/plugin-repository readiness, and practical skill workflows.

## Working Principles

- Prefer small, reviewable changes over broad rewrites.
- Keep documentation and workflows harness-neutral unless documenting the included OpenCode setup.
- Preserve attribution to Jesse Vincent ([@obra](https://github.com/obra)) and the [obra/superpowers](https://github.com/obra/superpowers) MIT-licensed baseline platform.
- Keep included-harness behavior explicit and tested in OpenCode when practical.
- Do not add third-party dependencies unless they are essential for the included OpenCode plugin support.
- Treat `skills/` and `agents/` as the canonical workflow sources.
- Treat `skills/` and `agents/` as harness-agnostic workflow sources.
- Treat `.opencode/plugins/superduperpowers.js`, `.opencode/plugins/superduperpowers/`, `.opencode/INSTALL.md`, and package metadata as the only included harness adapter surface for now.

## Install And Release Posture

- Primary distribution target is npm package-style plugin installation for OpenCode.
- Document npm installs as `superduperpowers` in OpenCode plugin config.
- Document GitHub installs as `superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#main` only as fallback/nightly/power-user repository-head installs.
- Document local checkout installs as `superduperpowers@git+file:///path/to/superduperpowers` for development against local checkouts.
- Do not present `npm install -g superduperpowers` as a supported product path.
- Keep npm metadata aligned with the included OpenCode plugin resolution.
- This project uses calendar versions in the form `YYYY.MMDD.N`, with zero-padded `MMDD`; GitHub Release tags use `vYYYY.MMDD.N`. Active release history lives in GitHub Releases, `main` is nightly/integration, and `latest` is the protected published-state branch.

## Skill Changes

Skills shape agent behavior. Edit them carefully.

- Keep wording direct, operational, and marketplace-appropriate.
- Avoid adding process unless it solves a concrete problem in this project.
- Keep canonical skill wording harness-neutral when practical and avoid stale adapter references.
- Put OpenCode-specific tool translations in active OpenCode docs only when they help users verify included behavior.
- Test changed skills with realistic prompts in the included OpenCode harness when practical.
- Do not add browser-server requirements unless the included OpenCode plugin support requires them.
- Do not instruct agents to commit changes unless the user explicitly requested commits or selected a Superpowers workflow that documents local workflow commits at spec, plan, or task-scope checkpoints. Never push without an explicit user request.

## Agent Changes

- Keep `agents/*.md` as the canonical reviewer-agent definitions.
- Keep fallback reviewer prompts aligned with the canonical agent definitions.
- Keep reviewer behavior read-only where the active harness supports tool restrictions.
- Verify reviewer registration through the included OpenCode plugin when changing agent definitions or plugin packaging.

## Pull Requests

For pull requests, explain the problem, summarize the change, list verification performed, and call out included OpenCode compatibility risks.
