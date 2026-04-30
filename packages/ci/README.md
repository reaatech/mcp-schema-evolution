# @reaatech/mcp-schema-evolution-ci

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-schema-evolution-ci.svg)](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-ci)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-schema-evolution/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-schema-evolution/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

CI/CD validation for MCP schema evolution. Compare tool snapshots against a policy, fail on unacknowledged breaking changes, and generate formatted reports for pull requests.

## Installation

```bash
npm install --save-dev @reaatech/mcp-schema-evolution-ci
# or
pnpm add -D @reaatech/mcp-schema-evolution-ci
```

## Feature Overview

- **Snapshot validation** — compare a PR head snapshot against a base branch snapshot
- **Policy enforcement** — configurable `failOnBreaking` with acknowledgment-based override
- **Acknowledgment file** — pipe-delimited format for declaring intentional breaking changes
- **Formatted reports** — `github-markdown` output for PR comments, `text` for CI logs
- **Programmatic and CLI APIs** — import as a library or invoke the `mcp-evolution-ci` binary
- **No-throw design** — `validateSnapshot()` returns a result object, never throws

## Quick Start

### CLI

```bash
npx mcp-evolution-ci --base snapshots/base.json --head snapshots/head.json --format github-markdown
```

### Programmatic API

```typescript
import { validateSnapshot, formatReport } from "@reaatech/mcp-schema-evolution-ci";

const result = validateSnapshot({
  baseSnapshot: "snapshots/base.json",
  headSnapshot: "snapshots/head.json",
  policy: {
    failOnBreaking: true,
    acknowledgmentFile: ".schema-breaking-allowed",
  },
});

if (result.ok) {
  console.log(`Passed: ${result.changes.length} changes, ${result.breakingCount} breaking`);
} else if (result.error) {
  console.error(`Error: ${result.error.message}`);
} else {
  console.error(`Failed: ${result.breakingCount} breaking changes`);
}

// Generate a PR comment
const markdown = formatReport(result, { format: "github-markdown" });
```

## API Reference

### `validateSnapshot(options): ValidationResult`

Compares a head snapshot against a base snapshot and returns a full validation result.

```typescript
function validateSnapshot(options: {
  baseSnapshot: string;    // file path to base (old) snapshot
  headSnapshot: string;    // file path to head (new) snapshot
  policy?: ValidationPolicy;
}): ValidationResult
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `baseSnapshot` | `string` | Yes | Path to the base snapshot JSON file (e.g. from `main`) |
| `headSnapshot` | `string` | Yes | Path to the head snapshot JSON file (e.g. from the PR branch) |
| `policy` | `ValidationPolicy` | No | Validation policy configuration |

### `formatReport(result, options?): string`

Formats a `ValidationResult` into a human-readable report string.

```typescript
function formatReport(
  result: ValidationResult,
  options?: { format: "github-markdown" | "text" }
): string
```

**Format options:**

| Format | Description |
|--------|-------------|
| `github-markdown` (default) | Full markdown report with badges, metrics table, and per-change details |
| `text` | Single-line pass/fail summary |

### Types

#### `ValidationPolicy`

```typescript
interface ValidationPolicy {
  failOnBreaking?: boolean;       // default: true
  acknowledgmentFile?: string;    // path to acknowledgment file
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `failOnBreaking` | `boolean` | `true` | If `false`, breaking changes are reported but never cause failure |
| `acknowledgmentFile` | `string` | `undefined` | Path to the acknowledgment file (e.g. `.schema-breaking-allowed`) |

#### `ValidationResult`

```typescript
interface ValidationResult {
  ok: boolean;                // true if validation passed
  changes: SchemaChange[];    // all detected changes
  breakingCount: number;      // total number of breaking changes (before acknowledgment)
  acknowledged: boolean;      // true if an acknowledgment file was found and non-empty
  error?: EvolutionError;     // present only on load or diff errors
}
```

| Field | Description |
|-------|-------------|
| `ok` | `true` when no unacknowledged breaking changes (or `failOnBreaking` is `false`) |
| `changes` | All changes detected by the diff engine (empty on error) |
| `breakingCount` | Raw count of breaking changes before subtracting acknowledgments |
| `acknowledged` | Whether an acknowledgment file with entries was found |
| `error` | Present only when snapshot loading or diffing fails |

## Acknowledgment File

When a breaking change is intentional (e.g., removing a deprecated field), create a `.schema-breaking-allowed` file in your repository root.

**Format:**

```
# Comment lines start with #
TOOL_NAME|CATEGORY|JUSTIFICATION
```

**Matching rules:**

- `TOOL_NAME`: The affected tool name, or `*` to match any tool
- `CATEGORY`: The change category (e.g. `field_removed`), or `*` to match any category
- `JUSTIFICATION`: Free-form description; matched case-insensitively against the change description

**Example:**

```
# .schema-breaking-allowed
# TOOL_NAME|CATEGORY|JUSTIFICATION

search|field_removed|Removed deprecated "query" param — replaced by "q" in v1.2.0
*|field_added|New required "trace_id" field for observability
calc|type_changed|Changed result type from number to string for precision
```

A change is considered acknowledged when it matches at least one entry's tool name (or wildcard), category (or wildcard), and the justification is contained within the change description (or vice versa).

## GitHub Actions Integration

```yaml
name: Schema Evolution Check
on:
  pull_request:
    paths:
      - "snapshots/**/*.json"

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # required to access base branch snapshots

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Run schema validation
        run: |
          node packages/ci/dist/bin.js \
            --base snapshots/base.snapshot.json \
            --head snapshots/head.snapshot.json \
            --format github-markdown > report.md

      - name: Post report as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("node:fs");
            const report = fs.readFileSync("report.md", "utf-8");
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: report,
            });
```

For programmatic integration with acknowledgment support:

```typescript
import { validateSnapshot, formatReport } from "@reaatech/mcp-schema-evolution-ci";

const result = validateSnapshot({
  baseSnapshot: process.env.BASE_SNAPSHOT ?? "snapshots/base.json",
  headSnapshot: process.env.HEAD_SNAPSHOT ?? "snapshots/head.json",
  policy: {
    failOnBreaking: true,
    acknowledgmentFile: ".schema-breaking-allowed",
  },
});

const report = formatReport(result, { format: "github-markdown" });
// Post report to PR via GitHub API
```

## CLI Reference

```
mcp-evolution-ci --base <path> --head <path> [--format <format>]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--base <path>` | Yes | Path to the base tool snapshot JSON |
| `--head <path>` | Yes | Path to the head tool snapshot JSON |
| `--format <format>` | No | `text` (default) or `github-markdown` |

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Validation passed (no unacknowledged breaking changes) |
| `1` | Validation failed or missing required arguments |

**Example:**

```bash
npx mcp-evolution-ci --base snapshots/base.json --head snapshots/head.json
npx mcp-evolution-ci --base snapshots/base.json --head snapshots/head.json --format github-markdown > report.md
```

## Report Format (github-markdown)

When validation passes:

```
## ✅ Schema Validation Passed

| Metric            | Value |
|-------------------|-------|
| Total changes     | 5     |
| Breaking changes  | 0     |
| Acknowledged      | No    |

### Changes

- **search** `search.inputSchema.properties.limit` — 🟡 non-breaking
  - Field "limit" was added to search (optional)
  - 💡 No action needed; the new field is optional.
```

When validation fails:

```
## ❌ Schema Validation Failed

| Metric            | Value |
|-------------------|-------|
| Total changes     | 3     |
| Breaking changes  | 2     |
| Acknowledged      | No    |

### Changes

- **calc** `calc.inputSchema.properties.result` — 🔴 **BREAKING**
  - Type changed from "number" to "string" in calc
  - 💡 Update values to match the new type. Use a wrapper to convert existing values.

> To allow these breaking changes, create an acknowledgment file (e.g., `.schema-breaking-allowed`).
```

## Related Packages

- [`@reaatech/mcp-schema-evolution`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution) — Core diffing engine
- [`@reaatech/mcp-schema-evolution-cli`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-cli) — CLI for diffing and validation

## License

[MIT](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
