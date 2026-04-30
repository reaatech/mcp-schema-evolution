# @reaatech/mcp-schema-evolution

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-schema-evolution.svg)](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-schema-evolution/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-schema-evolution/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Schema diffing, change classification, and field rename detection for MCP tool definitions. Compare two `Tool[]` snapshots and get a fully classified list of changes — breaking, non-breaking, or patch — with migration guidance for every change.

## Installation

```bash
npm install @reaatech/mcp-schema-evolution
# or
pnpm add @reaatech/mcp-schema-evolution
```

## Feature Overview

- **Schema diffing** — compare two `Tool[]` snapshots and detect added, removed, changed, and renamed fields
- **Recursive diff** — drills into nested `properties` and `items` schemas
- **Change classification** — every change is classified as `breaking`, `non-breaking`, or `patch` with severity (`high`, `medium`, `low`)
- **Field rename detection** — heuristic-based similarity scoring with configurable confidence threshold (default 0.8)
- **Migration guidance** — actionable suggestions and `automated` flag on every classified change
- **Result-based error handling** — all public functions return `Result<T>` (never throws)
- **Zero runtime dependencies** — only requires Node.js built-ins

## Quick Start

```typescript
import { diffToolSnapshots, loadToolsFromFile, type SchemaChange } from "@reaatech/mcp-schema-evolution";

// Load snapshots from disk
const v1 = loadToolsFromFile("snapshots/v1.json");
const v2 = loadToolsFromFile("snapshots/v2.json");

if (v1.ok && v2.ok) {
  const result = diffToolSnapshots(v1.value, v2.value);

  if (result.ok) {
    const changes: SchemaChange[] = result.value;
    const breaking = changes.filter((c) => c.type === "breaking");
    const nonBreaking = changes.filter((c) => c.type === "non-breaking");

    console.log(`${changes.length} changes: ${breaking.length} breaking, ${nonBreaking.length} non-breaking`);

    for (const change of changes) {
      console.log(`[${change.severity}] ${change.toolName} ${change.path}: ${change.description}`);
      if (change.migration) {
        console.log(`  → ${change.migration.suggestion}`);
      }
    }
  } else {
    console.error(result.error.message);
  }
}
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `diffToolSnapshots(old, new, options?)` | Compare two tool snapshots. Returns `Result<SchemaChange[]>`. |
| `classifyChange(detected)` | Classify a raw detected change into a full `SchemaChange` with type and severity. |
| `detectFieldRenames(old, new, options?)` | Detect probable field renames between two tools. Returns `FieldRename[]`. |
| `loadToolsFromFile(path)` | Load and validate a tool snapshot from a JSON file. Returns `Result<Tool[]>`. |

#### `diffToolSnapshots(oldTools: Tool[], newTools: Tool[], options?: DiffOptions): Result<SchemaChange[]>`

Compares two tool snapshots at the tool level, field level, and property level. Recursively diffs nested `properties` and `items` schemas. Automatically detects field renames using the configured threshold and aggregates rename + remove + add pairs into a single `field_renamed` change.

```typescript
import { diffToolSnapshots } from "@reaatech/mcp-schema-evolution";

const result = diffToolSnapshots(oldTools, newTools, { renameThreshold: 0.7 });
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `renameThreshold` | `number` (0–1) | `0.8` | Minimum similarity score for field rename detection |

#### `loadToolsFromFile(path: string): Result<Tool[]>`

Reads a JSON file from disk, parses it, and validates the structure:

- Must be a JSON array
- Each element must have a `name` (string) and `inputSchema` (object with `type` string)

**Error codes:**

| Code | When |
|------|------|
| `FILE_READ_ERROR` | File does not exist or cannot be read |
| `JSON_PARSE_ERROR` | File content is invalid JSON |
| `INVALID_FORMAT` | Root element is not an array |
| `INVALID_TOOL` | An element lacks valid `name` or `inputSchema` |

#### `classifyChange(detected: DetectedChange): SchemaChange`

Classifies a raw `DetectedChange` into a fully populated `SchemaChange` with `type`, `severity`, and optional `migration` guidance. Always succeeds.

#### `detectFieldRenames(oldTool: Tool, newTool: Tool, options?: { threshold?: number }): FieldRename[]`

Uses a weighted similarity heuristic to detect probable field renames:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Type match | 3 | Deep equality of JSON Schema `type` |
| Description match | 1 | Full match or substring containment |
| Enum match | 0.5 | Deep equality of `enum` arrays |
| Pattern match | 0.5 | Exact `pattern` string match |

Returns candidates whose similarity score meets or exceeds the threshold.

### Core Types

#### `Tool`

```typescript
interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    $schema?: string;
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}
```

#### `SchemaChange`

```typescript
interface SchemaChange {
  type: ChangeType;              // "breaking" | "non-breaking" | "patch"
  category: ChangeCategory;      // see classification table below
  toolName: string;              // affected MCP tool name
  path: string;                  // dot-separated path (e.g. "search.inputSchema.properties.query")
  description: string;           // human-readable change description
  severity: ChangeSeverity;      // "high" | "medium" | "low"
  migration?: MigrationGuidance; // actionable migration advice
}
```

#### `MigrationGuidance`

```typescript
interface MigrationGuidance {
  suggestion: string;     // human-readable migration advice
  codeExample?: string;   // optional code example
  automated: boolean;     // true if tooling can handle this automatically
}
```

#### `DetectedChange`

```typescript
interface DetectedChange {
  category: ChangeCategory;
  toolName: string;
  path: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  required?: boolean;       // only for field_added
  constraintName?: string;   // only for constraint_changed
}
```

#### `FieldRename`

```typescript
interface FieldRename {
  from: string;         // old field name
  to: string;           // new field name
  confidence: number;   // similarity score (0–1)
}
```

#### `Result<T>`

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: EvolutionError };
```

#### `EvolutionError`

```typescript
class EvolutionError extends Error {
  readonly code: string;
  readonly path: string | undefined;
  readonly suggestion: string | undefined;
}
```

#### Supporting Types

```typescript
type ChangeType = "breaking" | "non-breaking" | "patch";
type ChangeSeverity = "high" | "medium" | "low";
type ChangeCategory =
  | "tool_added"
  | "tool_removed"
  | "field_added"
  | "field_removed"
  | "field_renamed"
  | "type_changed"
  | "required_changed"
  | "default_changed"
  | "constraint_changed"
  | "deprecated";
type ToolSnapshot = Tool[];
type SemVer = `${number}.${number}.${number}`;
```

## Change Classification Reference

| Change | Category | Classification | Severity |
|--------|----------|----------------|----------|
| Removing a tool | `tool_removed` | `breaking` | `high` |
| Removing a required field | `field_removed` | `breaking` | `high` |
| Adding a required field (no default) | `field_added` | `breaking` | `high` |
| Renaming a field | `field_renamed` | `breaking` | `high` |
| Narrowing a type (`string` → `integer`) | `type_changed` | `breaking` | `high` |
| Field becoming required | `required_changed` | `breaking` | `high` |
| Tightening constraints (enum smaller, `minLength` up) | `constraint_changed` | `breaking` | `high` |
| Adding an optional field | `field_added` | `non-breaking` | `medium` |
| Adding a new tool | `tool_added` | `non-breaking` | `low` |
| Widening a type (`integer` → `number`) | `type_changed` | `non-breaking` | `medium` |
| Field becoming optional | `required_changed` | `non-breaking` | `medium` |
| Relaxing constraints (enum larger, `maxLength` up) | `constraint_changed` | `non-breaking` | `medium` |
| Default value changed | `default_changed` | `non-breaking` | `low` |
| Deprecating a field | `deprecated` | `non-breaking` | `medium` |

## Usage Pattern

```typescript
import {
  diffToolSnapshots,
  loadToolsFromFile,
  classifyChange,
  type DetectedChange,
  type SchemaChange,
} from "@reaatech/mcp-schema-evolution";

// Compare snapshots
const result = diffToolSnapshots(oldTools, newTools, { renameThreshold: 0.7 });
if (result.ok) {
  for (const change of result.value) {
    if (change.type === "breaking") {
      console.warn(`BREAKING: ${change.description}`);
      if (change.migration) {
        console.warn(`  Fix: ${change.migration.suggestion}`);
      }
    }
  }
}

// Manual classification
const raw: DetectedChange = {
  category: "field_removed",
  toolName: "search",
  path: "search.inputSchema.properties.query",
  description: 'Field "query" removed',
};
const classified: SchemaChange = classifyChange(raw);
// classified.type === "breaking", classified.severity === "high"

// Standalone rename detection
import { detectFieldRenames } from "@reaatech/mcp-schema-evolution";
const renames = detectFieldRenames(oldTool, newTool, { threshold: 0.5 });
for (const rename of renames) {
  console.log(`${rename.from} → ${rename.to} (${(rename.confidence * 100).toFixed(0)}%)`);
}
```

## Related Packages

- [`@reaatech/mcp-schema-evolution-cli`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-cli) — CLI for diffing and validation
- [`@reaatech/mcp-schema-evolution-ci`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-ci) — CI validation with policy enforcement

## License

[MIT](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
