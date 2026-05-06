#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const VERSION_RE = /^[0-9]{4}\.[0-9]{4}\.[0-9]+$/;
const root = path.resolve(new URL('..', import.meta.url).pathname);

function fail(message) {
  console.error(`release-gate: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`release-gate: ${message}`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`could not read JSON from ${file}: ${error.message}`);
  }
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commandOk(command, args) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitOk(args) {
  try {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function validProjectVersion(version) {
  const match = /^([0-9]{4})\.([0-9]{2})([0-9]{2})\.([0-9]+)$/.exec(version);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [31, (year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function normalizeHistoricalVersion(version) {
  const active = /^([0-9]{4})\.([0-9]{2})([0-9]{2})\.([0-9]+)$/.exec(version);
  if (active) return version;
  const historical = /^([0-9]{4})\.([0-9]{1,2})\.([0-9]{1,2})-([0-9]+)$/.exec(version);
  if (!historical) return null;
  return `${historical[1]}.${historical[2].padStart(2, '0')}${historical[3].padStart(2, '0')}.${historical[4]}`;
}

function showPackageVersionAtRef(ref) {
  let raw;
  try {
    raw = git(['show', `${ref}:package.json`]);
  } catch (error) {
    fail(`could not read package.json from ${ref}: ${error.message}`);
  }
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (error) {
    fail(`could not parse package.json from ${ref}: ${error.message}`);
  }
  const version = typeof pkg.version === 'string' ? normalizeHistoricalVersion(pkg.version) : null;
  if (!version || !validProjectVersion(version)) {
    fail(`package version at ${ref} must use valid YYYY.MMDD.N, found ${pkg.version ?? '<missing>'}`);
  }
  return version;
}

function tagExists(tag) {
  return gitOk(['rev-parse', '--verify', `refs/tags/${tag}`]) || gitOk(['show-ref', '--tags', '--verify', `refs/tags/${tag}`]);
}

function releaseExists(tag) {
  if (!commandOk('gh', ['--version'])) {
    if (process.env.GITHUB_ACTIONS === 'true') fail('gh CLI is required in GitHub Actions to check existing GitHub Releases');
    info('gh CLI is not available; skipping GitHub Release existence check for local release gate run');
    return false;
  }
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    if (process.env.GITHUB_ACTIONS === 'true') fail('GH_TOKEN or GITHUB_TOKEN is required in GitHub Actions to check existing GitHub Releases');
    info('GH_TOKEN or GITHUB_TOKEN is not set; skipping GitHub Release existence check for local release gate run');
    return false;
  }
  return commandOk('gh', ['release', 'view', tag]);
}

function resolveRef(name) {
  const candidates = [
    `refs/heads/${name}`,
    `refs/remotes/origin/${name}`,
    name,
    `origin/${name}`,
  ];
  for (const candidate of candidates) {
    if (gitOk(['rev-parse', '--verify', `${candidate}^{commit}`])) return candidate;
  }
  return null;
}

function packageMetadata() {
  const packagePath = path.join(root, 'package.json');
  const pkg = readJson(packagePath);
  if (pkg.name !== 'superduperpowers') fail(`package name must be superduperpowers, found ${pkg.name ?? '<missing>'}`);
  if (typeof pkg.version !== 'string' || !VERSION_RE.test(pkg.version) || !validProjectVersion(pkg.version)) {
    fail(`package version must use valid YYYY.MMDD.N, found ${pkg.version ?? '<missing>'}`);
  }
  if (typeof pkg.main !== 'string' || !fs.existsSync(path.join(root, pkg.main))) {
    fail(`package main entry is missing or does not exist: ${pkg.main ?? '<missing>'}`);
  }
  return pkg;
}

function eventPath() {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file) fail('GITHUB_EVENT_PATH is required');
  return file;
}

function hasSkipReleaseGateMarker(pr) {
  const text = [pr.title, pr.body].filter(Boolean).join('\n');
  return /\[skip release gate\]/i.test(text);
}

function runPrMode() {
  if (process.env.GITHUB_EVENT_NAME && process.env.GITHUB_EVENT_NAME !== 'pull_request') {
    fail(`PR mode requires pull_request event, found ${process.env.GITHUB_EVENT_NAME}`);
  }

  const event = readJson(eventPath());
  const pr = event.pull_request;
  const base = pr?.base?.ref;
  const head = pr?.head?.ref;
  if (!base || !head) fail('pull_request.base.ref and pull_request.head.ref are required');

  if (base === 'latest') {
    fail('PRs into latest are not allowed; latest is promoted only by the restricted manual release workflow');
  }
  if (base !== 'main') fail(`unsupported PR target '${base}'; release gate only accepts PRs into main`);

  packageMetadata();
  if (hasSkipReleaseGateMarker(pr)) {
    info('[skip release gate] accepted for main PR metadata-only gate; release-only version/changelog enforcement remains skipped');
  } else {
    info('main PR metadata gate passed; release-only version and changelog enforcement skipped');
  }
}

function runReleaseMode() {
  const event = readJson(eventPath());
  const sourceRef = event.ref ?? process.env.GITHUB_REF;
  if (!sourceRef) fail('release mode requires event.ref or GITHUB_REF');
  if (sourceRef !== 'refs/heads/main' && sourceRef !== 'main') {
    fail(`release source must be main, found ${sourceRef}`);
  }

  const latestRef = resolveRef('latest');
  if (!latestRef) fail('latest branch is required before release promotion');
  const mainRef = resolveRef('main');
  if (!mainRef) fail('main branch is required before release promotion');

  const pkg = packageMetadata();

  const latestVersion = showPackageVersionAtRef(latestRef);
  if (compareVersions(pkg.version, latestVersion) < 0) {
    fail(`main package version ${pkg.version} is lower than latest package version ${latestVersion}`);
  }

  const changelogPath = path.join(root, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath) || fs.readFileSync(changelogPath, 'utf8').trim().length === 0) {
    fail('CHANGELOG.md must exist and be non-empty as release-prep evidence on main');
  }

  if (!gitOk(['merge-base', '--is-ancestor', latestRef, mainRef])) {
    const latestSha = git(['rev-parse', latestRef]);
    const mainSha = git(['rev-parse', mainRef]);
    fail(`main is behind or diverged from latest; cannot verify fast-forward release (${latestRef}=${latestSha}, ${mainRef}=${mainSha})`);
  }

  info(`release gate passed for ${sourceRef}; latest can fast-forward from ${latestRef} to ${mainRef}`);
}

const modeIndex = process.argv.indexOf('--mode');
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined;
if (!mode) fail('missing --mode pr|release');

if (mode === 'pr') runPrMode();
else if (mode === 'release') runReleaseMode();
else fail(`unknown mode '${mode}'; expected pr or release`);
