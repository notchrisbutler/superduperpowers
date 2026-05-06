#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"
trap cleanup_test_env EXIT

echo "=== Test: Installer CLI behavior ==="

CLI="$SUPERPOWERS_DIR/bin/superduperpowers.js"
OUTPUT_DIR="$TEST_HOME/installer-output"
mkdir -p "$OUTPUT_DIR"

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

make_project() {
    local name="$1"
    mkdir -p "$TEST_HOME/$name"
    printf '%s\n' "$TEST_HOME/$name"
}

make_config_dir() {
    local name="$1"
    mkdir -p "$TEST_HOME/$name"
    printf '%s\n' "$TEST_HOME/$name"
}

run_cli() {
    local cwd="$1"
    local config_dir="$2"
    shift 2
    (cd "$cwd" && HOME="$TEST_HOME" OPENCODE_CONFIG_DIR="$config_dir" node "$CLI" "$@")
}

assert_file_exists() {
    [ -f "$1" ] || fail "expected file to exist: $1"
}

assert_dir_exists() {
    [ -d "$1" ] || fail "expected directory to exist: $1"
}

assert_json_expr() {
    local file="$1"
    local expr="$2"
    node -e '
const fs = require("fs");
const file = process.argv[1];
const expr = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Function("data", `return (${expr});`)(data)) {
  console.error(`assertion failed for ${file}: ${expr}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
' "$file" "$expr"
}

# Package metadata and executable packaging.
node -e '
const fs = require("fs");
const path = require("path");
const packageRoot = process.env.SUPERPOWERS_DIR;
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
if (packageJson.bin?.superduperpowers !== "./bin/superduperpowers.js") {
  throw new Error(`unexpected bin.superduperpowers: ${JSON.stringify(packageJson.bin)}`);
}
const firstLine = fs.readFileSync(path.join(packageRoot, "bin/superduperpowers.js"), "utf8").split(/\r?\n/, 1)[0];
if (firstLine !== "#!/usr/bin/env node") throw new Error(`unexpected binary shebang: ${firstLine}`);
for (const dir of ["defaults", "templates", "bin", "installer"]) {
  if (!fs.existsSync(path.join(packageRoot, dir))) throw new Error(`setup did not copy ${dir}/ into package layout`);
}
const pack = JSON.parse(require("child_process").execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: packageRoot, encoding: "utf8" }))[0];
const packed = new Set(pack.files.map((entry) => entry.path));
for (const file of [
  "bin/superduperpowers.js",
  "installer/cli.js",
  "installer/settings.js",
  "defaults/superduperpowers.config.jsonc",
  "templates/superduperpowers.settings.jsonc",
]) {
  if (!packed.has(file)) throw new Error(`npm pack would omit ${file}`);
}
'

# Project install creates root opencode.json with plugin and project settings.
project_basic="$(make_project project-basic)"
config_basic="$(make_config_dir config-basic)"
run_cli "$project_basic" "$config_basic" --repo >"$OUTPUT_DIR/basic.out"
assert_file_exists "$project_basic/opencode.json"
assert_json_expr "$project_basic/opencode.json" 'Array.isArray(data.plugin) && data.plugin.length === 1 && data.plugin[0] === "superduperpowers"'
assert_file_exists "$project_basic/.opencode/superduperpowers.jsonc"

# Project install preserves existing keys, appends to plugin arrays, and deduplicates npm entries.
project_merge="$(make_project project-merge)"
config_merge="$(make_config_dir config-merge)"
cat > "$project_merge/opencode.json" <<'JSON'
{
  "theme": "system",
  "model": "test-model",
  "plugin": ["other-plugin", "superduperpowers", "superduperpowers"]
}
JSON
run_cli "$project_merge" "$config_merge" --repo >"$OUTPUT_DIR/merge.out"
assert_json_expr "$project_merge/opencode.json" 'data.theme === "system" && data.model === "test-model"'
assert_json_expr "$project_merge/opencode.json" 'data.plugin.includes("other-plugin") && data.plugin.filter((entry) => entry === "superduperpowers").length === 1'

# Project install creates a minimal project config when no project config exists, even if a global config exists.
project_minimal="$(make_project project-minimal)"
config_minimal="$(make_config_dir config-minimal)"
cat > "$config_minimal/opencode.json" <<'JSON'
{
  "theme": "dark",
  "plugin": ["global-helper"]
}
JSON
run_cli "$project_minimal" "$config_minimal" --repo >"$OUTPUT_DIR/minimal.out"
assert_json_expr "$project_minimal/opencode.json" 'Object.keys(data).length === 1 && Array.isArray(data.plugin) && data.plugin.length === 1 && data.plugin[0] === "superduperpowers"'

# JSONC parsing preserves string literals that look like trailing comma patterns.
project_jsonc="$(make_project project-jsonc)"
config_jsonc="$(make_config_dir config-jsonc)"
cat > "$project_jsonc/opencode.jsonc" <<'JSONC'
{
  "theme": "literal ,} and ,] stays",
  "plugin": [
    "other-plugin",
  ],
}
JSONC
run_cli "$project_jsonc" "$config_jsonc" --repo >"$OUTPUT_DIR/jsonc.out"
assert_json_expr "$project_jsonc/opencode.jsonc" 'data.theme === "literal ,} and ,] stays" && data.plugin.includes("other-plugin") && data.plugin.includes("superduperpowers")'

# Project install uses configured generated-docs path for ignore hygiene.
project_hygiene="$(make_project project-hygiene)"
config_hygiene="$(make_config_dir config-hygiene)"
mkdir -p "$project_hygiene/.opencode"
cat > "$project_hygiene/.opencode/superduperpowers.jsonc" <<'JSONC'
{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "project-notes" },
  "paths": { "docsDirName": "sdp" }
}
JSONC
run_cli "$project_hygiene" "$config_hygiene" --repo >"$OUTPUT_DIR/hygiene.out"
grep -qx 'project-notes/sdp/' "$project_hygiene/.gitignore" || fail "project .gitignore did not use configured docs path"
grep -qx '!project-notes/sdp/' "$project_hygiene/.ignore" || fail "project .ignore did not use configured docs path"

# OPENCODE_CONFIG is an invocation override; installer refuses to edit durable configs while it is set.
project_override="$(make_project project-override)"
config_override="$(make_config_dir config-override)"
override_config="$TEST_HOME/custom-opencode.json"
cat > "$override_config" <<'JSON'
{
  "plugin": []
}
JSON
set +e
override_output="$(cd "$project_override" && HOME="$TEST_HOME" OPENCODE_CONFIG_DIR="$config_override" OPENCODE_CONFIG="$override_config" node "$CLI" --repo 2>&1)"
override_status=$?
set -e
[ "$override_status" -ne 0 ] || fail "install with OPENCODE_CONFIG unexpectedly succeeded"
[[ "$override_output" == *"OPENCODE_CONFIG is set"* ]] || fail "install with OPENCODE_CONFIG did not report manual action"
[ ! -f "$project_override/opencode.json" ] || fail "install with OPENCODE_CONFIG wrote project config"

# Global install creates/updates global OpenCode config and global settings.
project_global="$(make_project project-global)"
config_global="$(make_config_dir config-global)"
run_cli "$project_global" "$config_global" --global >"$OUTPUT_DIR/global.out"
assert_file_exists "$config_global/opencode.json"
assert_file_exists "$config_global/superduperpowers/settings.jsonc"
assert_json_expr "$config_global/opencode.json" 'Array.isArray(data.plugin) && data.plugin.includes("superduperpowers")'

# Effective settings precedence is package defaults, then global/user, then project.
project_precedence="$(make_project project-precedence)"
config_precedence="$(make_config_dir config-precedence)"
mkdir -p "$config_precedence/superduperpowers" "$project_precedence/.opencode"
cat > "$config_precedence/superduperpowers/settings.jsonc" <<'JSONC'
{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "global-docs" }
}
JSONC
cat > "$project_precedence/.opencode/superduperpowers.jsonc" <<'JSONC'
{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "project-docs" }
}
JSONC
OPENCODE_CONFIG_DIR="$config_precedence" TEST_PROJECT="$project_precedence" node --input-type=module <<'NODE'
const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const hooks = await SuperpowersPlugin({});
const result = JSON.parse(await hooks.tool.sdp_settings.execute({ operation: 'get' }, {
  sessionID: 'ses_installer_precedence',
  messageID: 'msg_installer_precedence',
  directory: process.env.TEST_PROJECT,
  worktree: process.env.TEST_PROJECT,
}));
if (!result.ok) throw new Error(`settings failed: ${JSON.stringify(result)}`);
if (result.settings.workflow.defaultDocsRoot !== 'project-docs') {
  throw new Error(`project settings did not win precedence: ${result.settings.workflow.defaultDocsRoot}`);
}
const loaded = result.sources.filter((source) => source.status === 'loaded');
const types = loaded.map((source) => source.type).join('>');
if (!types.startsWith('package-default>') || !types.includes('user>project')) {
  throw new Error(`unexpected settings source order: ${types}`);
}
NODE

# Uninstall removes only the selected npm plugin entry and preserves unrelated config/plugins.
project_uninstall="$(make_project project-uninstall)"
config_uninstall="$(make_config_dir config-uninstall)"
cat > "$project_uninstall/opencode.json" <<'JSON'
{
  "theme": "kept",
  "plugin": [
    "other-plugin",
    "superduperpowers",
    "superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#main"
  ]
}
JSON
mkdir -p "$project_uninstall/.opencode"
cp "$SUPERPOWERS_DIR/templates/superduperpowers.settings.jsonc" "$project_uninstall/.opencode/superduperpowers.jsonc"
run_cli "$project_uninstall" "$config_uninstall" uninstall --repo >"$OUTPUT_DIR/uninstall.out"
assert_json_expr "$project_uninstall/opencode.json" 'data.theme === "kept" && data.plugin.includes("other-plugin") && data.plugin.some((entry) => entry.includes("git+https://github.com")) && !data.plugin.includes("superduperpowers")'
assert_file_exists "$project_uninstall/.opencode/superduperpowers.jsonc"

# Uninstall dry run reports planned removals without writing files.
project_dry="$(make_project project-dry-run)"
config_dry="$(make_config_dir config-dry-run)"
cat > "$project_dry/opencode.json" <<'JSON'
{
  "plugin": ["other-plugin", "superduperpowers"]
}
JSON
before_dry="$(node -e 'const fs=require("fs"); process.stdout.write(fs.readFileSync(process.argv[1], "utf8"));' "$project_dry/opencode.json")"
dry_output="$(run_cli "$project_dry" "$config_dry" uninstall --repo --dry-run)"
after_dry="$(node -e 'const fs=require("fs"); process.stdout.write(fs.readFileSync(process.argv[1], "utf8"));' "$project_dry/opencode.json")"
[ "$before_dry" = "$after_dry" ] || fail "dry-run uninstall modified opencode.json"
[[ "$dry_output" == *"Would uninstall"* && "$dry_output" == *"Dry run; no files were changed."* ]] || fail "dry-run output did not report planned no-write removal"

# Runtime/session state wipe is not performed without explicit destructive opt-in.
project_state="$(make_project project-state-preserved)"
config_state="$(make_config_dir config-state-preserved)"
cat > "$config_state/opencode.json" <<'JSON'
{
  "plugin": ["superduperpowers"]
}
JSON
mkdir -p "$config_state/superduperpowers/state/session-a" "$config_state/superduperpowers/worktrees/worktree-a" "$config_state/superduperpowers/quarantine/item-a"
state_output="$(run_cli "$project_state" "$config_state" uninstall --global)"
assert_dir_exists "$config_state/superduperpowers/state/session-a"
assert_dir_exists "$config_state/superduperpowers/worktrees/worktree-a"
assert_dir_exists "$config_state/superduperpowers/quarantine/item-a"
[[ "$state_output" == *"Runtime/session state wipe requires interactive confirmation"* ]] || fail "uninstall did not report preserving runtime state"

echo "installer CLI behavior ok"
echo "=== Installer CLI behavior tests passed ==="
