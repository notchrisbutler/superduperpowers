# Testing SuperDuperPowers

This document describes tests for the included SuperDuperPowers harness config. The workflow sources are harness-agnostic, and the first included config is the OpenCode plugin.

Packaged marketplace/plugin artifacts may include this document without shipping the `tests/` directory. Clone or use a local repository checkout before running the commands below.

## Included OpenCode Test Runner

Run the default included-config test suite from the repository root:

```bash
tests/opencode/run-tests.sh
```

The default suite runs checks that do not require an installed OpenCode binary. It verifies plugin structure, packaged prompt sources, and static workflow policy assumptions that should work in a development checkout.

To inspect prompt/context footprint without running the whole suite:

```bash
npm run context:budget
npm run context:check
```

`context:check` fails only when the bootstrap exceeds its word budget. Large skill bodies are reported as warnings so workflow source files can remain comprehensive when that is intentional.

Run integration tests when OpenCode is available locally:

```bash
tests/opencode/run-tests.sh --integration
```

Integration tests exercise included OpenCode behavior such as skill discovery and plugin priority resolution.

Use verbose output when debugging failures:

```bash
tests/opencode/run-tests.sh --verbose
tests/opencode/run-tests.sh --integration --verbose
```

Run one named test when narrowing a failure:

```bash
tests/opencode/run-tests.sh --test test-plugin-loading.sh
```

When changing package metadata or release contents, also verify the npm package file list:

```bash
npm pack --dry-run
```

## Test Layout

```text
tests/opencode/
├── run-tests.sh              # Main OpenCode test runner
├── setup.sh                  # Shared setup helpers
├── test-plugin-loading.sh    # Package and plugin structure checks
├── test-workflow-policy.sh    # Static workflow text policy checks
├── test-agent-skill-drift.sh  # Agent/skill adapter drift and context-budget checks
├── test-tools.sh              # Integration test for OpenCode skill tools
└── test-duplicate-skills.sh   # Integration duplicate skill behavior
```

## Requirements

- Run commands from the SuperDuperPowers repository root.
- Use a development checkout when changing plugin code, skills, agents, or docs.
- Install OpenCode locally before running `tests/opencode/run-tests.sh --integration`.
- Keep test fixtures local and temporary; do not require global installation.

## What To Verify

After changing included OpenCode plugin code, package metadata, skills, or workflow agents, run the default suite:

```bash
tests/opencode/run-tests.sh
```

Run the integration suite when the change affects runtime OpenCode behavior:

```bash
tests/opencode/run-tests.sh --integration
```

Runtime behavior includes skill discovery, the `using-superpowers` bootstrap, reviewer agent registration, tool priority handling, and plugin loading inside OpenCode.

Package changes should include targeted verification:

```bash
npm pack --dry-run
```

Confirm the dry-run package contents include `defaults/`, `skills/`, `agents/`, docs, and `.opencode/plugins/` OpenCode plugin files.

When changing `agents/`, fallback prompts, or skill routing language, confirm `test-agent-skill-drift.sh` stays green. It verifies that skills remain canonical, named agents stay thin adapter roles, fallback prompts name their canonical agent, writable/read-only expectations stay aligned, and the context-budget check still passes.

## Manual Verification Prompts

When a change needs interactive confirmation, start a fresh OpenCode session with the package configured and use the prompts from [.opencode/INSTALL.md](../.opencode/INSTALL.md).

Verify these behaviors:

- Skills from `skills/` are discoverable through the OpenCode `skill` tool.
- Reviewer agents from `agents/` are available as named OpenCode subagent types.
- The `using-superpowers` bootstrap is injected once per session.
- Static policy checks pass without a live OpenCode model.
- Quick flow stays lightweight for bounded edits.
- No-SuperDuperPowers requests avoid loading workflow skills.

## Writing Or Updating Tests

- Keep tests in `tests/opencode/` unless a future OpenCode release-install test requires a separate fixture.
- Prefer checks that mirror documented install strings and plugin resolution behavior when those behaviors can be validated without requiring a global user setup.
- Add integration coverage for behavior that only appears inside an OpenCode session.
- Keep default tests fast and free of external runtime requirements.
- Use `--integration` for tests that need OpenCode itself.

## Troubleshooting

If skills are not discovered, verify the plugin is installed from the expected npm package name (`superduperpowers`) and restart OpenCode. For fallback/nightly or development installs, verify the GitHub `main` source or `git+file` checkout path instead.

If workflow subagents are missing, check `.opencode/plugins/superduperpowers.js` and confirm it registers the packaged definitions from `agents/`.

If integration tests fail before running assertions, confirm OpenCode is installed and available on `PATH`.
