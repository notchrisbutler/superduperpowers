# Debugging Examples and Transcripts

Use this reference for longer examples, rationale, and user-signal transcripts. The inline skill contains the required gates.

## Multi-Layer Evidence Example

When a failure crosses several components, instrument each boundary before proposing fixes.

```bash
# Layer 1: Workflow
echo "=== Secrets available in workflow: ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: Build script
echo "=== Env vars in build script: ==="
env | grep IDENTITY || echo "IDENTITY not in environment"

# Layer 3: Signing script
echo "=== Keychain state: ==="
security list-keychains
security find-identity -v

# Layer 4: Actual signing
codesign --sign "$IDENTITY" --verbose=4 "$APP"
```

This can reveal where propagation breaks, such as secrets present in the workflow but absent in the build environment.

## User Signals That You Are Guessing

Stop and return to investigation when the user says or implies:

- "Is that not happening?" You assumed without verifying.
- "Will it show us...?" You should have added evidence gathering.
- "Stop guessing." You are proposing fixes without understanding.
- "Ultrathink this." Question fundamentals, not just symptoms.
- "We're stuck?" The current approach is not working.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple" | Simple issues still have causes. |
| "Emergency" | Guessing under pressure creates more risk. |
| "Try this first" | First fix sets the pattern; investigate first. |
| "I'll test after" | Untested fixes do not stick. |
| "Multiple fixes saves time" | You cannot isolate what worked. |
| "Reference is long" | Partial understanding causes bugs. |
| "I see it" | Seeing a symptom is not proving root cause. |
| "One more attempt" | After two failures, stop for new evidence or direction. |

## Architecture Warning Pattern

Repeated fixes may reveal a wrong architecture rather than a stubborn bug when each fix exposes shared-state coupling, requires broad refactoring, or creates symptoms elsewhere. Stop and ask whether the pattern itself should change instead of continuing to patch symptoms.

## Impact Rationale

Systematic debugging reduces thrash by forcing evidence before change, one hypothesis at a time, and a hard stop after repeated failed fixes. The practical win is not ceremony; it is preventing speculative patches, new bugs, and false completion claims.
