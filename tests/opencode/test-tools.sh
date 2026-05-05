#!/usr/bin/env bash
# Test: Tools Functionality
# Verifies that OpenCode's native skill tool works correctly
# NOTE: These tests require OpenCode to be installed and configured
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Test: Tools Functionality ==="

run_with_optional_timeout() {
    if command -v timeout &> /dev/null; then
        timeout 60s "$@"
    elif command -v gtimeout &> /dev/null; then
        gtimeout 60s "$@"
    else
        "$@"
    fi
}

output_matches() {
    grep -qi "$1" <<< "$output"
}

print_output_snippet() {
    printf '%s\n' "$output" | sed -n '1,50p'
}

# Source setup to create isolated environment
source "$SCRIPT_DIR/setup.sh"

# Trap to cleanup on exit
trap cleanup_test_env EXIT

# Check if opencode is available
if ! command -v opencode &> /dev/null; then
    echo "  [SKIP] OpenCode not installed - skipping integration tests"
    echo "  To run these tests, install OpenCode: https://opencode.ai"
    exit 0
fi

# Test 1: Test native skill tool load
echo "Test 1: Testing native skill load..."
echo "  Running opencode with skill load request..."

output=$(run_with_optional_timeout opencode run "Use the skill tool to load the personal-test skill and show me what you get." 2>&1) || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo "  [FAIL] OpenCode timed out after 60s"
        exit 1
    fi
    echo "  [WARN] OpenCode returned non-zero exit code: $exit_code"
    exit 1
}

# Check for the skill marker we embedded
if output_matches "PERSONAL_SKILL_MARKER_12345\|Personal Test Skill"; then
    echo "  [PASS] native skill tool loaded personal-test skill content"
else
    echo "  [FAIL] native skill tool did not load personal-test skill correctly"
    echo "  Output was:"
    print_output_snippet
    exit 1
fi

# Test 2: Test native skill tool with bundled skill
echo ""
echo "Test 2: Testing native skill load with bundled skill..."
echo "  Running opencode with brainstorming skill..."

output=$(run_with_optional_timeout opencode run "Use the skill tool to load brainstorming and tell me the first few lines of what you received." 2>&1) || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo "  [FAIL] OpenCode timed out after 60s"
        exit 1
    fi
    echo "  [WARN] OpenCode returned non-zero exit code: $exit_code"
    exit 1
}

# Check for expected content or current OpenCode skill-load acknowledgement.
if output_matches "Brainstorming Ideas Into Designs\|Skill \"brainstorming\""; then
    echo "  [PASS] native skill tool loaded brainstorming skill"
else
    echo "  [FAIL] native skill tool did not load brainstorming correctly"
    echo "  Output was:"
    print_output_snippet
    exit 1
fi

echo ""
echo "=== All tools tests passed ==="
