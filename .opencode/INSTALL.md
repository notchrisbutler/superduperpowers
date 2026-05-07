# OpenCode Install

SuperDuperPowers is beta software. Its workflow sources are harness and model agnostic. OpenCode is the first included harness config, installed by editing your OpenCode `opencode.json` config manually.

## Manual Install

Add the stable npm package to your OpenCode `opencode.json` config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers"]
}
```

Restart OpenCode after install, update, or source changes so the package and config are reloaded.

The bare package name follows npm `latest`, which reflects the protected `latest` published-state branch. Use an explicit version such as `superduperpowers@2026.506.0` only when you want to pin a specific release tag such as `v2026.506.0`.

See GitHub Releases for release notes and active release history. npm `latest` is the stable OpenCode install path; GitHub `main` is the nightly repository-head path.

Optional workflow defaults can be copied from `defaults/superduperpowers.jsonc` into `.opencode/sdp.jsonc`, `.opencode/superduperpowers.jsonc`, `sdp.jsonc`, or `superduperpowers.jsonc`, then edited manually.

## First Run Verification

After restarting OpenCode, run:

```text
Use the superpowers brainstorming skill.
List the available subagent types relevant to SuperDuperPowers workflows.
/quick-flow make a tiny README wording suggestion
```

Expected: the `skill` tool can load bundled skills, named workflow agents are available, and quick flow stays lightweight unless the task escalates.

## Updates And Cache Busting

OpenCode documents package plugin loading through the `plugin` config option, and resolved plugin dependencies are cached under `~/.cache/opencode/node_modules/`.

If OpenCode keeps loading an older package copy, remove the cached SuperDuperPowers package directory under `~/.cache/opencode/node_modules/` if needed, and restart OpenCode. For the stable install path, OpenCode should resolve the npm package named `superduperpowers`. If you use a GitHub or local checkout source, update that source and restart OpenCode.

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
  "plugin": ["superduperpowers@git+file:///absolute/path/to/superduperpowers"]
}
```

Use an absolute path to the repository checkout. Restart OpenCode after changing the checkout or plugin config when you need to verify package loading from a clean session.

## What The Plugin Registers

The OpenCode plugin entrypoint is `.opencode/plugins/superduperpowers.js`.

- It adds the packaged `skills/` directory to OpenCode skill discovery.
- It registers named OpenCode subagents from `agents/`: reviewer agents, design/planning agents, implementation agents, and investigation/coordination agents.
- It injects compact SuperDuperPowers routing and project-config guidance into the first user message once per session so workflow context is available without duplicating it on later turns.

Bundled agents do not need to be copied into a project. The plugin registers the packaged agent definitions directly when it loads.

## Optional Project Defaults

The packaged defaults live in `defaults/superduperpowers.jsonc`. To customize workflow defaults, copy that file into `.opencode/sdp.jsonc`, `.opencode/superduperpowers.jsonc`, `sdp.jsonc`, or `superduperpowers.jsonc`, then edit the copy manually. Agents use prompt/subagent context first and read project config directly only when a workflow decision depends on it.

## Registered Commands

The plugin registers OpenCode slash commands through `config.command` and the TUI plugin command API; no command files need to be copied.

- `/sdp` - main SuperDuperPowers entrypoint.
- `/superduperpowers` - primary readable alias behavior for `/sdp`.
- `/superpowers` - legacy compatibility alias behavior.
- `/brainstorm` - start the full brainstorming workflow.
- `/quick-flow` - use lightweight SuperDuperPowers guidance for bounded work.
- `/write-plan` - write an implementation plan from an approved spec or design.
- `/execute-plan` - execute an approved plan after execution choices are recorded.

## Verify

Start a fresh OpenCode session and test these prompts.

For package/release verification from a repository checkout, run:

```bash
npm pack --dry-run
```

Expected: the dry-run package contents include `defaults/`, `skills/`, `agents/`, docs, and `.opencode/plugins/` OpenCode plugin files.

Skill discovery and bootstrap prompt:

```text
Use the superpowers brainstorming skill.
Use SuperDuperPowers brainstorming for this feature.
Use superduperpowers quick flow for a small typo fix.
Execute this approved plan with subagents using the provided plan context.
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
