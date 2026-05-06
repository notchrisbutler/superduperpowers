# OpenCode Install

SuperDuperPowers is beta software. Its workflow sources are harness and model agnostic. OpenCode is the first included harness config, installed from the GitHub repository. This is not an npm package or global CLI install path.

## GitHub Package Install

Add the plugin to your OpenCode config, typically `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git"]
}
```

Start a fresh OpenCode session after changing plugin config so the package is resolved and loaded.

If you previously tested a local shim named `superpowers.js` in your user OpenCode plugins directory, remove that stale shim before verifying this package. The included entrypoint is now `superduperpowers.js`; keeping both shims can make OpenCode load duplicate plugin copies.

See GitHub Releases for release notes and active release history.

## First Run

After OpenCode starts, run:

```text
/sdp-status
```

Expected: the agent runs `sdp_doctor`, reports the SuperDuperPowers tools, commands, bundled skills, and workflow agents, and warns if project-local setup is still missing.

Then run:

```text
/sdp-init
```

Expected: the agent creates `.opencode/superduperpowers.jsonc` if it does not already exist. This is explicit rather than automatic so installing the plugin does not mutate projects without user intent.

For a quick usage check, run:

```text
/quick-flow make a tiny README wording suggestion
```

Expected: the agent stays lightweight and does not enter full brainstorming, planning, or TDD unless the task escalates.

## Updates And Cache Busting

OpenCode documents package plugin loading through the `plugin` config option, and resolved plugin dependencies are cached under `~/.cache/opencode/node_modules/`.

If OpenCode keeps loading an older package copy, remove the cached SuperDuperPowers package directory under `~/.cache/opencode/node_modules/` and restart OpenCode. If you use a local checkout, update that checkout and restart OpenCode.

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

The packaged defaults live in `superduperpowers.config.jsonc`. Override them per project with `superduperpowers.jsonc`, `superduperpowers.config.jsonc`, or `.opencode/superduperpowers.jsonc`, and per user with `{OPENCODE_CONFIG_DIR}/superduperpowers/settings.jsonc`.

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
- `/sdp-setup` - create `.opencode/superduperpowers.jsonc` if project-local defaults are missing.
- `/sdp-init` - create `.opencode/superduperpowers.jsonc` if project-local defaults are missing.
- `/sdp-cleanup` - inspect stale runtime state and clean only after confirmation unless cleanup was explicitly requested.

`/sdp-cleanup` follows OpenCode session presence first: if the matching OpenCode session is gone, the same-ID SuperDuperPowers state can be removed. If OpenCode session presence cannot be checked, stale means the SDP state directory has not been updated or reactivated in the configured retention window. The default and maximum retention window is 7 days.

## Runtime Drift Repair

The plugin may automatically repair corrupted SuperDuperPowers-owned session state under `{OPENCODE_CONFIG_DIR}/superduperpowers/state/{sessionID}/`. Corrupt state is moved to `{OPENCODE_CONFIG_DIR}/superduperpowers/quarantine/` before replacement.

Automatic repair never edits `opencode.json`, project files, generated specs/plans, plugin shims, git branches, commits, or the staging area. Use `/sdp-status` to see repair history and remaining warnings.

## Verify

Start a fresh OpenCode session and test these prompts.

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
