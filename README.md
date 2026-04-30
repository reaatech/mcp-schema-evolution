# mcp-schema-evolution

[![CI](https://github.com/reaatech/mcp-schema-evolution/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-schema-evolution/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

> Enterprise-grade toolkit for safe, automated MCP schema evolution. Diff. Adapt. Ship with confidence.

Bring Protocol Buffers-style evolution rules to MCP tool schemas. Compare `Tool[]` snapshots between versions, classify every change as breaking or non-breaking, and enforce evolution policy in CI — before your consumers break.

## Features

- **Schema diffing** — compare two `Tool[]` snapshots and detect added, removed, changed, and renamed fields with recursive nested schema support
- **Change classification** — every change is classified as `breaking`, `non-breaking`, or `patch` with severity and migration guidance
- **Field rename detection** — heuristic-based similarity scoring with configurable confidence threshold
- **CI validation** — validate snapshots in CI; fail on unacknowledged breaking changes with a pipe-delimited acknowledgment file
- **PR reporting** — generate formatted markdown reports for pull request comments
- **CLI** — single `mcp-evolution diff` command with human-readable and JSON output modes
- **Result-based error handling** — all public APIs return `Result<T>` (never throws)

## Installation

### Using the packages

Packages are published under the `@reaatech` scope and can be installed individually:

```bash
# Core library — diffing, classification, rename detection
pnpm add @reaatech/mcp-schema-evolution

# CLI — diff snapshots from the command line
pnpm add @reaatech/mcp-schema-evolution-cli

# CI integration — validate snapshots in pull requests
pnpm add -D @reaatech/mcp-schema-evolution-ci
```

### Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/mcp-schema-evolution.git
cd mcp-schema-evolution

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the test suite
pnpm test

# Run linting, typecheck, and tests
pnpm check
```

## Quick Start

### Library API

```typescript
import { diffToolSnapshots, loadToolsFromFile } from "@reaatech/mcp-schema-evolution";

const v1 = loadToolsFromFile("snapshots/v1.json");
const v2 = loadToolsFromFile("snapshots/v2.json");

if (v1.ok && v2.ok) {
  const result = diffToolSnapshots(v1.value, v2.value);

  if (result.ok) {
    const breaking = result.value.filter((c) => c.type === "breaking");
    const nonBreaking = result.value.filter((c) => c.type === "non-breaking");

    console.log(
      `${result.value.length} changes: ${breaking.length} breaking, ${nonBreaking.length} non-breaking`
    );

    for (const change of result.value) {
      console.log(`[${change.severity}] ${change.toolName}: ${change.description}`);
      if (change.migration) {
        console.log(`  → ${change.migration.suggestion}`);
      }
    }
  }
}
```

### CLI

```bash
mcp-evolution diff tools.v1.json tools.v2.json
mcp-evolution diff tools.v1.json tools.v2.json --json
```

### CI Validation

```bash
npx mcp-evolution-ci --base snapshots/base.json --head snapshots/head.json --format github-markdown
```

```typescript
import { validateSnapshot, formatReport } from "@reaatech/mcp-schema-evolution-ci";

const result = validateSnapshot({
  baseSnapshot: "snapshots/base.json",
  headSnapshot: "snapshots/head.json",
  policy: { failOnBreaking: true, acknowledgmentFile: ".schema-breaking-allowed" },
});

if (!result.ok) {
  console.log(formatReport(result, { format: "github-markdown" }));
  process.exit(1);
}
```

## Packages

| Package | Description |
| ------- | ----------- |
| [`@reaatech/mcp-schema-evolution`](./packages/core) | Schema diffing, change classification, field rename detection |
| [`@reaatech/mcp-schema-evolution-cli`](./packages/cli) | `mcp-evolution` command-line interface |
| [`@reaatech/mcp-schema-evolution-ci`](./packages/ci) | CI validation with acknowledgment-based policy enforcement |

## Change Classification Reference

| Change | Classification | Severity |
| ------ | -------------- | -------- |
| Removing a tool | `breaking` | `high` |
| Removing a required field | `breaking` | `high` |
| Adding a required field (no default) | `breaking` | `high` |
| Renaming a field (without wrapper) | `breaking` | `high` |
| Narrowing a type (`string` → `integer`) | `breaking` | `high` |
| Tightening constraints (`minLength` increased) | `breaking` | `high` |
| Removing enum values | `breaking` | `high` |
| Field becoming required | `breaking` | `high` |
| Adding an optional field | `non-breaking` | `medium` |
| Adding a field with a default value | `non-breaking` | `medium` |
| Widening a type (`integer` → `number`) | `non-breaking` | `medium` |
| Adding enum values | `non-breaking` | `medium` |
| Relaxing constraints | `non-breaking` | `medium` |
| Adding a new tool | `non-breaking` | `low` |
| Deprecating a field | `non-breaking` | `medium` |
| Documentation-only changes | `patch` | `low` |
| Default value changes | `patch` | `low` |

## Acknowledging Breaking Changes

When a breaking change is intentional, create a `.schema-breaking-allowed` file:

```
# Format: TOOL_NAME|CHANGE_CATEGORY|DESCRIPTION
search|field_removed|Removed deprecated "query" param — replaced by "q" in v1.2.0
*|field_added|New required "trace_id" field added for observability
```

Lines beginning with `#` are ignored. Use `*` as a wildcard to match any tool or category.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, package relationships, and data flows
- [AGENTS.md](./AGENTS.md) — Coding conventions and development guidelines for AI agents
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution workflow and release process
- [DEV_PLAN.md](./DEV_PLAN.md) — Development roadmap and planned features

## License

[MIT](LICENSE) © [reaatech](https://github.com/reaatech)
