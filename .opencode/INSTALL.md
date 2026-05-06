# OpenCode Install

SuperDuperPowers is beta software. Its workflow sources are harness and model agnostic. OpenCode is the first included harness config, installed from the npm package `superduperpowers`.

## CLI Install

From your repository, install or update SuperDuperPowers with the npm CLI package:

```bash
npx superduperpowers
```

The CLI writes or updates your OpenCode config. OpenCode still resolves and loads the plugin from npm through:

```json
"plugin": ["superduperpowers"]
```

Use these explicit commands when you need a specific action or scope:

```bash
npx superduperpowers@latest
npx superduperpowers --repo
npx superduperpowers --global
npx superduperpowers uninstall
npx superduperpowers status
```

Restart OpenCode after install, update, or uninstall so the package and config are reloaded.

The bare package name follows npm `latest`, which reflects the protected `latest` published-state branch. Use an explicit version such as `superduperpowers@2026.506.0` only when you want to pin a specific release tag such as `v2026.506.0`.

If you previously tested a local shim named `superpowers.js` in your user OpenCode plugins directory, remove that stale shim before verifying this package. The included entrypoint is now `superduperpowers.js`; keeping both shims can make OpenCode load duplicate plugin copies.

See GitHub Releases for release notes and active release history. npm `latest` is the stable OpenCode install path; GitHub `main` is the nightly repository-head path.

## First Run Verification

After restarting OpenCode, run:

```text
/sdp-status
```

Expected: the agent runs `sdp_doctor`, reports the SuperDuperPowers tools, commands, bundled skills, workflow agents, and active settings sources.

If diagnostics show missing or damaged project-local settings and the CLI cannot repair them, use the fallback slash commands:

```text
/sdp-setup
/sdp-init
```

Expected: the agent creates `.opencode/superduperpowers.jsonc` if it does not already exist. These are fallback/repair commands, not the primary first-run setup path.

For a quick usage check, run:

```text
/quick-flow make a tiny README wording suggestion
```

Expected: the agent stays lightweight and does not enter full brainstorming, planning, or TDD unless the task escalates.

## Updates And Cache Busting

OpenCode documents package plugin loading through the `plugin` config option, and resolved plugin dependencies are cached under `~/.cache/opencode/node_modules/`.

If OpenCode keeps loading an older package copy, run `npx superduperpowers@latest`, remove the cached SuperDuperPowers package directory under `~/.cache/opencode/node_modules/` if needed, and restart OpenCode. For the stable install path, OpenCode should resolve the npm package named `superduperpowers`. If you use a GitHub or local checkout source, update that source and restart OpenCode.

## GitHub Fallback And Nightly Install

Power users can install directly from the GitHub `main` branch when they want a fallback source or nightly-style updates before the next npm release. `main` is not the published-state branch and can include unreleased bugs or packaging changes:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#main"]
}
```

Use npm `latest` unless you intentionally want repository-head behavior.

## Local Checkout Install

For development against a local checkout, use a `git+file` source:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+file:///path/to/superduperpowers"]
}
```

Use an absolute path to the repository checkout. Restart OpenCode after changing the checkout or plugin config when you need to verify package loading from a clean session.

## What The Plugin Registers

The OpenCode plugin entrypoint is `.opencode/plugins/superduperpowers.js`.

- It adds the packaged `skills/` directory to OpenCode skill discovery.
- It registers named OpenCode subagents from `agents/`: reviewer agents, design/planning agents, implementation agents, and investigation/coordination agents.
- It injects a compact SuperDuperPowers routing bootstrap into the first user message once per session so routing guidance is available without duplicating it on later turns.
- Custom tools: `sdp_settings`, `sdp_init`, `sdp_profile`, `sdp_setup_hygiene`, `sdp_branch_context`, and `sdp_doctor`.
- User-level runtime state and default worktrees under `{OPENCODE_CONFIG_DIR}/superduperpowers/`.

Bundled agents do not need to be copied into a project. The plugin registers the packaged agent definitions directly when it loads.

## Live Settings

The packaged defaults live in `defaults/superduperpowers.jsonc`. Override them per user with `{OPENCODE_CONFIG_DIR}/superduperpowers/settings.jsonc` and per project with `superduperpowers.jsonc`, `superduperpowers.config.jsonc`, or `.opencode/superduperpowers.jsonc`. Project settings override global settings.

Agents read these settings through `sdp_settings`; they are intentionally live, so changes made after a session starts can be picked up when a workflow decision depends on them.

## Registered Commands

The plugin registers OpenCode slash commands through `config.command` and the TUI plugin command API; no command files need to be copied.

- `/sdp` - main SuperDuperPowers entrypoint.
- `/superduperpowers` - primary readable alias behavior for `/sdp`.
- `/superpowers` - legacy compatibility alias behavior.
- `/brainstorm` - start the full brainstorming workflow.
- `/quick-flow` - use lightweight SuperDuperPowers guidance for bounded work.
- `/write-plan` - write an implementation plan from an approved spec or design.
- `/execute-plan` - execute an approved plan after execution choices are recorded.
- `/sdp-status` - run read-only diagnostics through `sdp_doctor`.
- `/sdp-profile` - summarize the active workflow profile.
- `/sdp-setup` - fallback/repair command to create `.opencode/superduperpowers.jsonc` if project-local settings are missing.
- `/sdp-init` - fallback/repair command to create `.opencode/superduperpowers.jsonc` if project-local settings are missing.
- `/sdp-cleanup` - inspect stale runtime state and clean only after confirmation unless cleanup was explicitly requested.

`/sdp-cleanup` follows OpenCode session presence first: if the matching OpenCode session is gone, the same-ID SuperDuperPowers state can be removed. If OpenCode session presence cannot be checked, stale means the SDP state directory has not been updated or reactivated in the configured retention window. The default and maximum retention window is 7 days.

## Runtime Drift Repair

The plugin may automatically repair corrupted SuperDuperPowers-owned session state under `{OPENCODE_CONFIG_DIR}/superduperpowers/state/{sessionID}/`. Corrupt state is moved to `{OPENCODE_CONFIG_DIR}/superduperpowers/quarantine/` before replacement.

Automatic repair never edits `opencode.json`, project files, generated specs/plans, plugin shims, git branches, commits, or the staging area. Use `/sdp-status` to see repair history and remaining warnings.

## Verify

Start a fresh OpenCode session and test these prompts.

For package/release verification from a repository checkout, run:

```bash
tests/opencode/run-tests.sh --test test-installer-cli.sh
npm pack --dry-run
```

Expected: the installer CLI test passes, and the dry-run package contents include `bin/`, `installer/`, and `defaults/` alongside the existing `skills/`, `agents/`, docs, and `.opencode/plugins/` OpenCode plugin files.

Skill discovery and bootstrap prompt:

```text
Use the superpowers brainstorming skill.
Use SuperDuperPowers brainstorming for this feature.
Use superduperpowers quick flow for a small typo fix.
Execute this approved plan with subagents using user-level worktrees.
```

Expected: the `skill` tool can load skills from this package, the `using-superpowers` bootstrap is present once, and the agent follows the requested brainstorming workflow.

SuperDuperPowers subagents prompt:

```text
List the available subagent types relevant to SuperDuperPowers workflows.
```

Expected: reviewer agents (`code-reviewer`, `spec-reviewer`, `lite-code-reviewer`, `lite-spec-reviewer`), planning agents (`brainstorming-facilitator`, `plan-writer`, `plan-reviewer`), implementation agents (`implementer`, `tdd-implementer`), and investigation/coordination agents (`debugging-investigator`, `parallelization-advisor`) are available as named subagents.

Quick-flow prompt:

```text
Using SuperDuperPowers quick flow, make a small README wording improvement.
```

Expected: the agent gathers lightweight context, makes the bounded change, runs targeted validation when practical, and avoids full brainstorming, TDD, and planning unless the task escalates. If a bounded attempt fails repeatedly, it should stop and re-evaluate instead of cycling through variants.

No-SuperDuperPowers prompt:

```text
Fix a typo in README without using SuperDuperPowers.
```

Expected: the agent does not load brainstorming, TDD, planning, or other SuperDuperPowers workflow skills for the no-SuperDuperPowers prompt.
