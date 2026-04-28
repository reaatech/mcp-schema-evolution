# mcp-schema-evolution

<p align="center">
  <strong>Enterprise-grade toolkit for safe, automated MCP schema evolution.</strong><br/>
  Diff. Adapt. Ship with confidence.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript"/>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green"/>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-brightgreen"/>
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-%3E%3D8-orange"/>
</p>

---

## The Problem

You ship an MCP server. Agents and downstream services start depending on your tool schemas. Now you need to add a required parameter or rename a field — and there is no established pattern for how to do that safely.

This library brings **Protocol Buffers-style evolution rules** to MCP tool schemas, providing the tooling server authors need to manage change without breaking their consumers.

## What It Does

| Capability                 | Description                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema Diffing**         | Compare `Tool[]` snapshots between versions — detects added, removed, and changed fields, type changes, constraint changes, and renames |
| **Change Classification**  | Every detected change is classified as `breaking`, `non-breaking`, or `patch` with severity and migration guidance                      |
| **Field Rename Detection** | Heuristic-based rename detection with configurable confidence threshold (default 0.8)                                                   |
| **CI Validation**          | Validate snapshots in CI; fail on unacknowledged breaking changes with an acknowledgment file                                           |
| **CLI**                    | `mcp-evolution diff` command for local and CI workflows                                                                                 |

## Monorepo Packages

| Package                                         | npm                                                                                                                         | Purpose                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@mcp-schema-evolution/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@mcp-schema-evolution/core)](https://www.npmjs.com/package/@mcp-schema-evolution/core) | Schema diffing, change classification, field rename detection |
| [`@mcp-schema-evolution/cli`](./packages/cli)   | [![npm](https://img.shields.io/npm/v/@mcp-schema-evolution/cli)](https://www.npmjs.com/package/@mcp-schema-evolution/cli)   | `mcp-evolution` command-line interface                        |
| [`@mcp-schema-evolution/ci`](./packages/ci)     | [![npm](https://img.shields.io/npm/v/@mcp-schema-evolution/ci)](https://www.npmjs.com/package/@mcp-schema-evolution/ci)     | CI validation with acknowledgment-based policy enforcement    |

## Installation

```bash
# Core library
npm install @mcp-schema-evolution/core

# CLI (global or per-project)
npm install -g @mcp-schema-evolution/cli

# CI integration
npm install --save-dev @mcp-schema-evolution/ci
```

> **Requirements**: Node.js >= 18.0.0, pnpm >= 8.0.0 (for development)

## Quick Start

### Library API

```typescript
import { diffToolSnapshots, loadToolsFromFile } from '@mcp-schema-evolution/core';
import { writeFileSync } from 'node:fs';

// Compare two snapshots directly from files
const result = loadToolsFromFile('snapshots/v1.json');
const result2 = loadToolsFromFile('snapshots/v2.json');

if (result.ok && result2.ok) {
  const diff = diffToolSnapshots(result.value, result2.value);

  if (diff.ok) {
    const breaking = diff.value.filter((c) => c.type === 'breaking');
    const nonBreaking = diff.value.filter((c) => c.type === 'non-breaking');
    const patches = diff.value.filter((c) => c.type === 'patch');

    console.log(
      `${diff.value.length} changes: ${breaking.length} breaking, ${nonBreaking.length} non-breaking, ${patches.length} patches`
    );

    for (const change of diff.value) {
      console.log(`  [${change.severity}] ${change.toolName}: ${change.description}`);
      if (change.migration) {
        console.log(`    -> ${change.migration.suggestion}`);
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
npx mcp-evolution-ci --base tools.v1.json --head tools.v2.json --format github-markdown
```

## Change Classification Reference

| Change                                         | Classification | Severity |
| ---------------------------------------------- | -------------- | -------- |
| Removing a tool                                | `breaking`     | `high`   |
| Removing a required field                      | `breaking`     | `high`   |
| Adding a required field (no default)           | `breaking`     | `high`   |
| Renaming a field (without wrapper)             | `breaking`     | `high`   |
| Narrowing a type (`string` -> `integer`)       | `breaking`     | `high`   |
| Tightening constraints (`minLength` increased) | `breaking`     | `high`   |
| Removing enum values                           | `breaking`     | `high`   |
| Field becoming required                        | `breaking`     | `high`   |
| Adding an optional field                       | `non-breaking` | `medium` |
| Adding a field with a default value            | `non-breaking` | `medium` |
| Widening a type (`integer` -> `number`)        | `non-breaking` | `medium` |
| Adding enum values                             | `non-breaking` | `medium` |
| Relaxing constraints                           | `non-breaking` | `medium` |
| Adding a new tool                              | `non-breaking` | `low`    |
| Deprecating a field                            | `non-breaking` | `medium` |
| Documentation-only changes                     | `patch`        | `low`    |
| Default value changes                          | `patch`        | `low`    |

## Acknowledging Breaking Changes

When a breaking change is intentional, create a `.schema-breaking-allowed` file:

```
# Format: TOOL_NAME|CHANGE_CATEGORY|DESCRIPTION
search|field_removed|Removed deprecated "query" param — replaced by "q" in v1.2.0
*|field_added|New required "trace_id" field added for observability
```

Lines beginning with `#` are ignored. Wildcard `*` matches any tool or category.

## Development

```bash
# Clone and install
git clone https://github.com/reaatech/mcp-schema-evolution.git
cd mcp-schema-evolution
pnpm install

# Available commands
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm test:coverage  # Run tests with coverage
pnpm lint           # Lint all source files
pnpm format         # Format all files
pnpm typecheck      # Type-check all packages
pnpm check          # Run lint, typecheck, and tests
```

## Architecture

```
packages/
├── core/     # Diffing engine, change classification, file I/O
├── cli/      # Commander-based CLI with `diff` command
└── ci/       # Snapshot validation with policy enforcement
```

The core library operates on `Tool[]` — the same shape returned by an MCP server's `tools/list` capability. All public APIs return `Result<T>` (`{ ok: true; value: T } | { ok: false; error: EvolutionError }`) instead of throwing, making error paths explicit and testable.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design specification and [DEV_PLAN.md](./DEV_PLAN.md) for the development roadmap.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on reporting bugs, suggesting features, and submitting pull requests.

This project uses [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm changeset        # Create a changeset for your changes
pnpm version-packages # Consume changesets and bump versions
```

## License

MIT © [reaatech](https://github.com/reaatech)
