#!/usr/bin/env bash
#
# bump-version.sh — bump version numbers across all declared files,
# with drift detection and repo-wide audit for missed files.
#
# Usage:
#   bump-version.sh --next          Bump to today's next release version
#   bump-version.sh <new-version>   Bump all declared files to new version
#   bump-version.sh --check         Report current versions (detect drift)
#   bump-version.sh --audit         Check + grep repo for old version strings
#
# Project versions use YYYY.[M]MDD.N, where single-digit months do not keep a
# leading zero because npm normalizes SemVer numeric fields. Git tags use
# vYYYY.[M]MDD.N.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$REPO_ROOT/.version-bump.json"

if [[ ! -f "$CONFIG" ]]; then
  echo "error: .version-bump.json not found at $CONFIG" >&2
  exit 1
fi

# --- helpers ---

# Read a dotted field path from a JSON file.
# Handles both simple ("version") and nested ("plugins.0.version") paths.
read_json_field() {
  local file="$1" field="$2"
  # Convert dot-path to jq path: "plugins.0.version" -> .plugins[0].version
  local jq_path
  jq_path=$(echo "$field" | sed -E 's/\.([0-9]+)/[\1]/g' | sed 's/^/./' | sed 's/\.\././g')
  jq -r "$jq_path" "$file"
}

# Write a dotted field path in a JSON file, preserving formatting.
write_json_field() {
  local file="$1" field="$2" value="$3"
  local jq_path
  jq_path=$(echo "$field" | sed -E 's/\.([0-9]+)/[\1]/g' | sed 's/^/./' | sed 's/\.\././g')
  local tmp="${file}.tmp"
  jq "$jq_path = \"$value\"" "$file" > "$tmp" && mv "$tmp" "$file"
}

# Read the list of declared files from config.
# Outputs lines of "path<TAB>field"
declared_files() {
  jq -r '.files[] | "\(.path)\t\(.field)"' "$CONFIG"
}

# Read the audit exclude patterns from config.
audit_excludes() {
  jq -r '.audit.exclude[]' "$CONFIG" 2>/dev/null
}

path_is_audit_excluded() {
  local rel_path="$1" pattern
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    if [[ "$rel_path" == "$pattern" || "$rel_path" == "$pattern"/* || "$(basename "$rel_path")" == "$pattern" ]]; then
      return 0
    fi
  done < <(audit_excludes)
  return 1
}

current_declared_version() {
  while IFS=$'\t' read -r path field; do
    local fullpath="$REPO_ROOT/$path"
    [[ -f "$fullpath" ]] && read_json_field "$fullpath" "$field"
  done < <(declared_files) | sort | uniq -c | sort -rn | head -1 | awk '{print $2}'
}

is_project_version() {
  local version="$1" year middle month day suffix daysInMonth
  [[ "$version" =~ ^([0-9]{4})\.([0-9]{3,4})\.([0-9]+)$ ]] || return 1
  year="${BASH_REMATCH[1]}"
  middle="${BASH_REMATCH[2]}"
  [[ ${#middle} -eq 4 && "$middle" == 0* ]] && return 1
  month="${middle:0:${#middle}-2}"
  day="${middle: -2}"
  suffix="${BASH_REMATCH[3]}"
  [[ "$suffix" =~ ^[0-9]+$ ]] || return 1
  case "$((10#$month))" in
    1|3|5|7|8|10|12) daysInMonth=31 ;;
    4|6|9|11) daysInMonth=30 ;;
    2)
      if (( (10#$year % 400 == 0) || (10#$year % 4 == 0 && 10#$year % 100 != 0) )); then
        daysInMonth=29
      else
        daysInMonth=28
      fi
      ;;
    *) return 1 ;;
  esac
  (( 10#$day >= 1 && 10#$day <= daysInMonth ))
}

badge_version() {
  printf '%s' "$1"
}

update_readme_badge() {
  local version="$1"
  local readme="$REPO_ROOT/README.md"
  [[ -f "$readme" ]] || return 0

  local tmp="${readme}.tmp"
  sed -E \
    -e "s#version-[0-9]{4}\.[0-9]+\.[0-9]+(--[0-9]+|--alpha\.[0-9]+)?-purple\.svg#version-$(badge_version "$version")-purple.svg#g" \
    -e "/\[!\[Version\]/ s#https://github\.com/notchrisbutler/superduperpowers/releases(/tag/v[0-9]{4}\.[0-9]+\.[0-9]+(--[0-9]+|--alpha\.[0-9]+)?)?#https://github.com/notchrisbutler/superduperpowers/releases/tag/v${version}#g" \
    "$readme" > "$tmp"
  mv "$tmp" "$readme"
}

next_version_for_today() {
  local today today_re current max_suffix version tag_name
  today=$(date '+%Y.%m%d')
  today="${today/.0/.}"
  today_re=${today//./\\.}
  current=$(current_declared_version)
  max_suffix=-1

  if [[ "$current" =~ ^${today_re}\.([0-9]+)$ ]]; then
    max_suffix="${BASH_REMATCH[1]}"
  fi

  while IFS= read -r tag_name; do
    version="${tag_name#v}"
    if [[ "$version" =~ ^${today_re}\.([0-9]+)$ ]]; then
      (( BASH_REMATCH[1] > max_suffix )) && max_suffix="${BASH_REMATCH[1]}"
    fi
  done < <(git -C "$REPO_ROOT" tag --list "v${today}.*" | sort -u)

  if (( max_suffix < 0 )); then
    printf '%s.0\n' "$today"
  else
    printf '%s.%s\n' "$today" "$((max_suffix + 1))"
  fi
}

# --- commands ---

cmd_check() {
  local has_drift=0
  local versions=()

  echo "Version check:"
  echo ""

  while IFS=$'\t' read -r path field; do
    local fullpath="$REPO_ROOT/$path"
    if [[ ! -f "$fullpath" ]]; then
      printf "  %-45s  MISSING\n" "$path ($field)"
      has_drift=1
      continue
    fi
    local ver
    ver=$(read_json_field "$fullpath" "$field")
    printf "  %-45s  %s\n" "$path ($field)" "$ver"
    if ! is_project_version "$ver"; then
      echo "  INVALID: expected YYYY.[M]MDD.N"
      has_drift=1
    fi
    versions+=("$ver")
  done < <(declared_files)

  echo ""

  # Check if all versions match
  local unique
  unique=$(printf '%s\n' "${versions[@]}" | sort -u | wc -l | tr -d ' ')
  if [[ "$unique" -gt 1 ]]; then
    echo "DRIFT DETECTED — versions are not in sync:"
    printf '%s\n' "${versions[@]}" | sort | uniq -c | sort -rn | while read -r count ver; do
      echo "  $ver ($count files)"
    done
    has_drift=1
  else
    echo "All declared files are in sync at ${versions[0]}"
  fi

  return $has_drift
}

cmd_audit() {
  # First run check
  cmd_check || true
  echo ""

  # Determine the current version (most common across declared files)
  local current_version
  current_version=$(
    while IFS=$'\t' read -r path field; do
      local fullpath="$REPO_ROOT/$path"
      [[ -f "$fullpath" ]] && read_json_field "$fullpath" "$field"
    done < <(declared_files) | sort | uniq -c | sort -rn | head -1 | awk '{print $2}'
  )

  if [[ -z "$current_version" ]]; then
    echo "error: could not determine current version" >&2
    return 1
  fi

  echo "Audit: scanning repo for version string '$current_version'..."
  echo ""

  # Build grep exclude args
  local -a exclude_args=()
  while IFS= read -r pattern; do
    exclude_args+=("--exclude=$pattern" "--exclude-dir=$pattern")
  done < <(audit_excludes)

  # Also always exclude binary files and .git
  exclude_args+=("--exclude-dir=.git" "--exclude-dir=node_modules" "--binary-files=without-match")

  # Get list of declared paths for comparison
  local -a declared_paths=()
  while IFS=$'\t' read -r path _field; do
    declared_paths+=("$path")
  done < <(declared_files)
  declared_paths+=("README.md")

  # Grep for the version string
  local found_undeclared=0
  while IFS= read -r match; do
    local match_file
    match_file=$(echo "$match" | cut -d: -f1)
    # Make path relative to repo root
    local rel_path="${match_file#$REPO_ROOT/}"

    if path_is_audit_excluded "$rel_path"; then
      continue
    fi

    # Check if this file is in the declared list
    local is_declared=0
    for dp in "${declared_paths[@]}"; do
      if [[ "$rel_path" == "$dp" ]]; then
        is_declared=1
        break
      fi
    done

    if [[ "$is_declared" -eq 0 ]]; then
      if [[ "$found_undeclared" -eq 0 ]]; then
        echo "UNDECLARED files containing '$current_version':"
        found_undeclared=1
      fi
      echo "  $match"
    fi
  done < <(grep -rn "${exclude_args[@]}" -F "$current_version" "$REPO_ROOT" 2>/dev/null || true)

  if [[ "$found_undeclared" -eq 0 ]]; then
    echo "No undeclared files contain the version string. All clear."
  else
    echo ""
    echo "Review the above files — if they should be bumped, add them to .version-bump.json"
    echo "If they should be skipped, add them to the audit.exclude list."
    return 1
  fi
}

cmd_bump() {
  local new_version="$1"

  if ! is_project_version "$new_version"; then
    echo "error: '$new_version' doesn't look like a project version (expected YYYY.[M]MDD.N)" >&2
    exit 1
  fi

  echo "Bumping all declared files to $new_version..."
  echo ""

  while IFS=$'\t' read -r path field; do
    local fullpath="$REPO_ROOT/$path"
    if [[ ! -f "$fullpath" ]]; then
      echo "  SKIP (missing): $path"
      continue
    fi
    local old_ver
    old_ver=$(read_json_field "$fullpath" "$field")
    write_json_field "$fullpath" "$field" "$new_version"
    printf "  %-45s  %s -> %s\n" "$path ($field)" "$old_ver" "$new_version"
  done < <(declared_files)

  update_readme_badge "$new_version"

  echo ""
  echo "Done. Running audit to check for missed files..."
  echo ""
  cmd_audit
}

# --- main ---

case "${1:-}" in
  --next)
    cmd_bump "$(next_version_for_today)"
    ;;
  --check)
    cmd_check
    ;;
  --audit)
    cmd_audit
    ;;
  --help|-h|"")
    echo "Usage: bump-version.sh --next | <new-version> | --check | --audit"
    echo ""
    echo "  --next         Bump to today's next vYYYY.[M]MDD.N release version based on package.json and tags"
    echo "  <new-version>  Bump all declared files to the given date version, e.g. 2026.506.0 or 2026.1006.1"
    echo "  --check        Show current versions, detect drift"
    echo "  --audit        Check + scan repo for undeclared version references"
    exit 0
    ;;
  --*)
    echo "error: unknown flag '$1'" >&2
    exit 1
    ;;
  *)
    cmd_bump "$1"
    ;;
esac
