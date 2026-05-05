# SuperDuperPowers

**OpenCode-first skills and workflow agents for deliberate coding workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2026.5.5--1-purple.svg)](https://github.com/notchrisbutler/superduperpowers/releases)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-111827.svg)](.opencode/INSTALL.md)

SuperDuperPowers gives coding agents a practical workflow toolkit: brainstorm when the work is ambiguous, write plans when the scope is real, execute in grouped phases, review at meaningful checkpoints, and verify before claiming success.

This project is built from Jesse Vincent's [obra/superpowers](https://github.com/obra/superpowers) baseline platform and substantially modifies the workflow, packaging, and agent model. Jesse Vincent ([@obra](https://github.com/obra)) and contributors retain their original MIT-licensed attribution.

---

## Included Harness Config

SuperDuperPowers is beta software. The workflow core is intended to stay harness and model agnostic. The first included harness config is for OpenCode, installed from the GitHub repository.

Add the plugin to your OpenCode config, typically `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git"]
}
```

See [GitHub Releases](https://github.com/notchrisbutler/superduperpowers/releases) for release notes and active release history.

For local checkout development, use a `git+file` source instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superduperpowers@git+file:///path/to/superduperpowers"]
}
```

See [OpenCode Install](.opencode/INSTALL.md) for the included setup and verification prompts.

After the first launch, run `/sdp-status` to confirm the plugin loaded and `/sdp-init` to create `.opencode/superduperpowers.jsonc` for project-local defaults.

---

## Features

- Opt-in SuperDuperPowers routing with full flow, quick flow, and no-SuperDuperPowers modes
- Live JSON/JSONC settings through `superduperpowers.config.jsonc`, project overrides, and compact `sdp_settings` summaries
- Workflow profile tools for route, docs, execution, branch, and testing-intensity decisions; compact summaries are used by default, full JSON is available on demand
- User-level OpenCode runtime state and default worktrees under `{OPENCODE_CONFIG_DIR}/superduperpowers/`
- OpenCode TUI commands: `/sdp`, `/superduperpowers`, `/superpowers`, `/brainstorm`, `/quick-flow`, `/write-plan`, `/execute-plan`, `/sdp-status`, `/sdp-profile`, `/sdp-init`, and `/sdp-cleanup`
- Read-only OpenCode diagnostics through `sdp_doctor` and `/sdp-status`
- Safe automatic repair for SuperDuperPowers-owned runtime-state drift under `{OPENCODE_CONFIG_DIR}/superduperpowers/state/`; corrupt state is quarantined and repair does not edit user config, project files, generated docs, plugin shims, or git state
- Legacy `superpowers.js` shim and duplicate-load warnings are reported through `sdp_doctor` and `/sdp-status`
- Project-local generated specs and plans under `{DOCS_ROOT}/superduperpowers/`, local-only by default and configurable through live settings
- Brainstorming, planning, TDD, debugging, verification, and branch-finishing skills
- Coordinator-owned execution with flat, dependency-ordered dispatch todos that stay readable in agent harnesses
- Named workflow agents for review, planning, implementation, TDD, debugging, and safe parallelization
- Local-first finishing flow that prepares PR commands without pushing unless explicitly requested
- Included OpenCode plugin entrypoint through `.opencode/plugins/superduperpowers.js`
- Calendar release versioning in the form `YYYY.M.D`, with `YYYY.M.D-N` for additional same-day releases

---

## Documentation

| Guide | Description |
|-------|-------------|
| [OpenCode Install](.opencode/INSTALL.md) | Included OpenCode plugin setup and routing verification prompts |
| [Workflow Map](docs/workflow-map.md) | Current SDP routes, skill categories, agent roles, and registration constraints |
| [Wiki](docs/wiki/index.md) | Documentation index |
| [Testing](docs/testing.md) | Included OpenCode config tests and integration checks |
| [Publishing](docs/publishing.md) | GitHub Releases and `latest` tag release flow |
| [GitHub Releases](https://github.com/notchrisbutler/superduperpowers/releases) | Release notes and active release history |
| [Acknowledgements](ACKNOWLEDGEMENTS.md) | Baseline platform attribution |

---

## Core Workflow

SuperDuperPowers is opt-in by default for normal coding turns.

- Explicit requests such as `using superduperpowers brainstorming`, `using superpowers brainstorming`, `/brainstorm`, `/superduperpowers`, or `use superpowers executing-plans` load the requested workflow.
- Clearly deep and ambiguous, investigation-heavy, high-risk, or plan-heavy requests may still trigger SuperDuperPowers implicitly.
- Small reviews, quick code changes, wording edits, and config tweaks can use quick flow: check enough context, make the smallest correct change, run targeted validation when practical, and report what changed.
- Trivial requests or requests to avoid SuperDuperPowers use normal agent behavior unless SuperDuperPowers is invoked later.
- If intent is unclear, the agent should ask whether to use full flow, quick flow, or no SuperDuperPowers for the session.

Available full-flow workflows include brainstorming, planning, execution, TDD, debugging, verification, spec review, code review, and development-branch completion.

Generated SuperDuperPowers specs and plans are local-only by default unless live settings or explicit user/repo instructions enable committing approved generated docs. Implementation workflows can still use local commits for verified implementation task scopes and final verified implementation changes. Pushes and PR creation require explicit user instruction.

## Live Settings

The packaged defaults live in `superduperpowers.config.jsonc`. OpenCode sessions can also read project overrides from `superduperpowers.jsonc`, `superduperpowers.config.jsonc`, or `.opencode/superduperpowers.jsonc`, and user overrides from `{OPENCODE_CONFIG_DIR}/superduperpowers/settings.jsonc`. Agents should call `sdp_settings` only when a workflow decision depends on live settings or settings may have changed.

`skills/using-superpowers/SKILL.md` is the source of truth for routing details.

---

## Security

Please review [SECURITY.md](SECURITY.md) for supported version policy and responsible disclosure instructions. Do not file public GitHub issues for security bugs.

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests.

---

## License

SuperDuperPowers is available under the MIT License. See [LICENSE](LICENSE) for the full license text.

---

## Acknowledgements

- [Jesse Vincent](https://github.com/obra) and [obra/superpowers](https://github.com/obra/superpowers) - the MIT-licensed baseline platform this project builds on
- The Superpowers contributors whose work made the baseline platform possible
- The coding-agent harness ecosystems that make portable skills and workflow agents practical

---

## Author

**Chris Butler** - [@notchrisbutler](https://github.com/notchrisbutler)
