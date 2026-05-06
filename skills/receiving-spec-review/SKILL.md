---
name: receiving-spec-review
description: Use when receiving lite or full spec-review feedback before deciding whether to fix, escalate, or ask the user for clarification.
metadata:
  category: review
---

# Receiving Spec Review

Spec review feedback is about requirement compliance, not style preference.

**Core principle:** Missing requirements and unrequested scope are blocking until fixed, disproved, or clarified by the user.

Use this skill whenever `lite-spec-reviewer`, `spec-reviewer`, or `plan-reviewer` returns findings during `writing-plans`, `subagent-driven-development`, or `executing-plans`. Do not treat review feedback as an instruction to blindly change scope; evaluate it against the actual spec, plan, and user request first.

## Response Pattern

1. Read the complete `lite-spec-reviewer` or `spec-reviewer` result.
2. If lite review says `Escalate`, request full `spec-reviewer` review before proceeding.
3. Verify each finding against the exact requirement source and current code/diff.
4. Fix confirmed missing requirements or unrequested scope.
5. Ask the user when requirements are ambiguous or a requested fix would expand scope.
6. Re-run spec review when fixes change compliance-relevant behavior.

## Handling Findings

| Finding | Action |
|---|---|
| Missing requirement | Fix before proceeding |
| Unrequested scope | Remove or ask user to approve scope change |
| Ambiguous requirement | Ask user before implementing assumptions |
| Missing validation evidence | Run validation or state why it cannot be run |
| Incorrect reviewer claim | Push back with exact requirement and code evidence |

## Red Flags

- Do not treat spec approval as code-quality approval.
- Do not treat code review approval as spec approval.
- Do not implement broad new behavior to satisfy an ambiguous spec finding without asking.
- Do not proceed past `Changes Required` unless findings are fixed, disproved, or explicitly waived by the user.
