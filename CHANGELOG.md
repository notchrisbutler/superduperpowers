This patch simplifies SuperDuperPowers into a prompt-first OpenCode plugin by removing the premature installer path, custom runtime tools, and session-state layer.

## Highlights

- Stable setup is now manual OpenCode config with `"plugin": ["superduperpowers"]`.
- The `npx superduperpowers` installer, npm binary, installer package files, and installer tests were removed.
- All `sdp_*` custom OpenCode tools and plugin-managed runtime/session state were removed.
- Workflow defaults remain configurable through manually edited project-local `superduperpowers.json[c]` or `sdp.json[c]` files in the project root or `.opencode/`.
- Skills now instruct the orchestrator to read relevant config directly and pass context explicitly to subagents.

## Install Model

- npm `superduperpowers` is the stable latest package source for OpenCode plugin config.
- GitHub URL installs are documented as nightly/feature/power-user repository-head installs.
- Local checkout installs use `git+file` sources for development.

## Package And Validation

- The npm package no longer includes `bin/` or `installer/`.
- Release and OpenCode tests now validate the smaller package/plugin surface.
- Package dry-run checks ensure generated local docs and removed installer assets stay out of the published package.
