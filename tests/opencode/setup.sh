#!/usr/bin/env bash
# Setup script for OpenCode plugin tests
# Creates an isolated test environment with proper plugin installation
set -euo pipefail

# Get the repository root (two levels up from tests/opencode/)
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Create temp home directory for isolation
export TEST_HOME
TEST_HOME=$(mktemp -d)
export HOME="$TEST_HOME"
export XDG_CONFIG_HOME="$TEST_HOME/.config"
export OPENCODE_CONFIG_DIR="$TEST_HOME/.config/opencode"

# Package-style test layout:
#   $OPENCODE_CONFIG_DIR/superduperpowers/             ← package root
#   $OPENCODE_CONFIG_DIR/superduperpowers/package.json ← package metadata with main entrypoint
#   $OPENCODE_CONFIG_DIR/superduperpowers/skills/      ← skills dir (../../skills from plugin)
#   $OPENCODE_CONFIG_DIR/superduperpowers/agents/      ← bundled named subagents
#   $OPENCODE_CONFIG_DIR/superduperpowers/.opencode/plugins/superduperpowers.js ← plugin file
#   $OPENCODE_CONFIG_DIR/plugins/superduperpowers.js        ← local-plugin shim for integration tests

SUPERPOWERS_DIR="$OPENCODE_CONFIG_DIR/superduperpowers"
SUPERPOWERS_SKILLS_DIR="$SUPERPOWERS_DIR/skills"
SUPERPOWERS_PLUGIN_FILE="$SUPERPOWERS_DIR/.opencode/plugins/superduperpowers.js"

# Install skills
mkdir -p "$SUPERPOWERS_DIR"
cp -r "$REPO_ROOT/skills" "$SUPERPOWERS_DIR/"
cp -r "$REPO_ROOT/agents" "$SUPERPOWERS_DIR/"
cp "$REPO_ROOT/package.json" "$SUPERPOWERS_DIR/package.json"
for package_dir in defaults bin installer; do
    if [ -d "$REPO_ROOT/$package_dir" ]; then
        cp -R "$REPO_ROOT/$package_dir" "$SUPERPOWERS_DIR/"
    fi
done
if [ -d "$REPO_ROOT/.opencode/node_modules" ]; then
    mkdir -p "$SUPERPOWERS_DIR/.opencode"
    cp -R "$REPO_ROOT/.opencode/node_modules" "$SUPERPOWERS_DIR/.opencode/"
fi
if [ -f "$REPO_ROOT/.opencode/package.json" ]; then
    mkdir -p "$SUPERPOWERS_DIR/.opencode"
    cp "$REPO_ROOT/.opencode/package.json" "$SUPERPOWERS_DIR/.opencode/package.json"
fi
if [ ! -f "$SUPERPOWERS_DIR/.opencode/node_modules/@opencode-ai/plugin/package.json" ]; then
    mkdir -p "$SUPERPOWERS_DIR/.opencode/node_modules/@opencode-ai/plugin/dist"
    cat > "$SUPERPOWERS_DIR/.opencode/node_modules/@opencode-ai/plugin/package.json" <<'EOF'
{"name":"@opencode-ai/plugin","version":"1.14.30","type":"module","exports":{".":"./dist/index.js"}}
EOF
    cat > "$SUPERPOWERS_DIR/.opencode/node_modules/@opencode-ai/plugin/dist/index.js" <<'EOF'
const chain = () => ({ optional: chain, int: chain, positive: chain });
export function tool(input) { return input; }
tool.schema = {
  enum: () => chain(),
  record: () => chain(),
  any: () => chain(),
  number: () => chain(),
  string: () => chain()
};
EOF
fi

# Install plugin
mkdir -p "$(dirname "$SUPERPOWERS_PLUGIN_FILE")"
cp "$REPO_ROOT/.opencode/plugins/superduperpowers.js" "$SUPERPOWERS_PLUGIN_FILE"
if [ -d "$REPO_ROOT/.opencode/plugins/superduperpowers" ]; then
    cp -R "$REPO_ROOT/.opencode/plugins/superduperpowers" "$(dirname "$SUPERPOWERS_PLUGIN_FILE")/"
fi

# Register plugin via symlink (what OpenCode actually reads)
mkdir -p "$OPENCODE_CONFIG_DIR/plugins"
ln -sf "$SUPERPOWERS_PLUGIN_FILE" "$OPENCODE_CONFIG_DIR/plugins/superduperpowers.js"

# Create test skills in different locations for testing

# Personal test skill
mkdir -p "$OPENCODE_CONFIG_DIR/skills/personal-test"
cat > "$OPENCODE_CONFIG_DIR/skills/personal-test/SKILL.md" <<'EOF'
---
name: personal-test
description: Test personal skill for verification
---
# Personal Test Skill

This is a personal skill used for testing.

PERSONAL_SKILL_MARKER_12345
EOF

# Create a project directory for project-level skill tests
mkdir -p "$TEST_HOME/test-project/.opencode/skills/project-test"
cat > "$TEST_HOME/test-project/.opencode/skills/project-test/SKILL.md" <<'EOF'
---
name: project-test
description: Test project skill for verification
---
# Project Test Skill

This is a project skill used for testing.

PROJECT_SKILL_MARKER_67890
EOF

echo "Setup complete: $TEST_HOME"
echo "OPENCODE_CONFIG_DIR:  $OPENCODE_CONFIG_DIR"
echo "Superpowers dir:      $SUPERPOWERS_DIR"
echo "Skills dir:           $SUPERPOWERS_SKILLS_DIR"
echo "Agents dir:           $SUPERPOWERS_DIR/agents"
echo "Plugin file:          $SUPERPOWERS_PLUGIN_FILE"
echo "Plugin registered at: $OPENCODE_CONFIG_DIR/plugins/superduperpowers.js"
echo "Test project at:      $TEST_HOME/test-project"

# Helper function for cleanup (call from tests or trap)
cleanup_test_env() {
    if [ -n "${TEST_HOME:-}" ] && [ -d "$TEST_HOME" ]; then
        rm -rf "$TEST_HOME"
    fi
}

# Export for use in tests
export -f cleanup_test_env
export REPO_ROOT
export SUPERPOWERS_DIR
export SUPERPOWERS_SKILLS_DIR
export SUPERPOWERS_PLUGIN_FILE
