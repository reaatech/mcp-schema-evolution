# MCP Schema Evolution — Architecture Specification

## System Overview

The mcp-schema-evolution library is a TypeScript toolkit for managing change in MCP (Model Context Protocol) tool schemas. It is designed as a **library + CLI** that server authors use to declare, diff, and adapt their tool definitions over time.

The architecture follows enterprise-grade patterns with clear separation of concerns, strict type safety, and minimal external dependencies.

## Architectural Principles

1. **Ground Truth: The MCP Protocol** — All types and operations are based on the actual MCP specification, not invented container formats.
2. **Type Safety First** — Strict TypeScript with zero `any` in public APIs.
3. **Composable by Design** — Each module can be used standalone.
4. **Backward Compatibility** — Non-breaking evolution is the default; breaking changes must be explicit.
5. **Minimal Indirection** — No heavy plugin system in v1. Configuration and rule overrides are sufficient.

## Integration Model

MCP servers define tools in code. This library integrates at **build time** and **optional runtime**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server Author                            │
│                                                                   │
│  1. Declare tools in TypeScript/JSON                            │
│     const tools: Tool[] = [...]                                  │
│                                                                   │
│  2. Check in a snapshot (tools.snapshot.json)                    │
│                                                                   │
│  3. On change, run CLI:                                          │
│     $ mcp-evolution diff tools.v1.json tools.v2.json            │
│                                                                   │
│  4. If breaking, generate wrapper:                               │
│     $ mcp-evolution wrap --from v1 --to v2                      │
│                                                                   │
│  5. CI blocks unacknowledged breaking changes                    │
└─────────────────────────────────────────────────────────────────┘
```

The library operates on **`Tool[]`** — the same shape returned by an MCP server's `tools/list` capability.

## Core Types

```typescript
import type { Tool } from '@modelcontextprotocol/sdk';

// A snapshot is simply the tool list at a point in time.
// Server authors commit these to version control.
type ToolSnapshot = Tool[];

// Semantic version string
type SemVer = `${number}.${number}.${number}`;

// Change classification
type ChangeType = 'breaking' | 'non-breaking' | 'patch';
type ChangeSeverity = 'high' | 'medium' | 'low';

// Unified error type for all operations
class EvolutionError extends Error {
  readonly code: string;
  readonly path?: string;
  readonly suggestion?: string;
}

// Result type used throughout the codebase (no throwing in core logic)
type Result<T> = { ok: true; value: T } | { ok: false; error: EvolutionError };
```

## Core Modules

### 1. Schema Diffing (`packages/core/src/diff`)

**Purpose**: Compare two `Tool[]` snapshots and detect changes.

**Components**:

- `diffToolSnapshots(old: Tool[], new: Tool[]): Result<SchemaChange[]>`
- `classifyChange(change: DetectedChange): ChangeType`
- `detectFieldRenames(oldTool: Tool, newTool: Tool, threshold?: number): FieldRename[]`

**Change Classification**:

| Change                                     | Classification | Version Impact |
| ------------------------------------------ | -------------- | -------------- |
| Removing a tool                            | breaking       | major          |
| Removing a required input field            | breaking       | major          |
| Adding a required input field (no default) | breaking       | major          |
| Renaming a field (without alias/wrapper)   | breaking       | major          |
| Narrowing a type (string → number)         | breaking       | major          |
| Removing enum values                       | breaking       | major          |
| Tightening constraints                     | breaking       | major          |
| Adding an optional field                   | non-breaking   | minor          |
| Adding a field with a default value        | non-breaking   | minor          |
| Widening a type (integer → number)         | non-breaking   | minor          |
| Adding enum values                         | non-breaking   | minor          |
| Relaxing constraints                       | non-breaking   | minor          |
| Adding a new tool                          | non-breaking   | minor          |
| Deprecating a field                        | non-breaking   | minor          |
| Documentation updates                      | patch          | patch          |

```typescript
interface SchemaChange {
  type: ChangeType;
  category: ChangeCategory;
  toolName: string;
  path: string; // JSON-pointer style path within inputSchema
  description: string;
  severity: ChangeSeverity;
  migration?: MigrationGuidance;
}

type ChangeCategory =
  | 'tool_added'
  | 'tool_removed'
  | 'field_added'
  | 'field_removed'
  | 'field_renamed'
  | 'type_changed'
  | 'required_changed'
  | 'default_changed'
  | 'constraint_changed'
  | 'deprecated';

interface MigrationGuidance {
  suggestion: string;
  codeExample?: string;
  automated: boolean; // true if wrapper can handle this automatically
}
```

### 2. Wrapper Generation (`packages/core/src/wrapper`)

**Purpose**: Generate adapter functions that map old call shapes to new call shapes.

**Key Function**:

```typescript
generateWrapper(
  oldTools: Tool[],
  newTools: Tool[],
  changes: SchemaChange[],
  config?: WrapperConfig
): Result<WrapperMap>;
```

A `WrapperMap` is a record of tool names to adapter functions:

```typescript
type WrapperMap = Record<string, (oldArgs: unknown) => Result<unknown>>;
```

**Generated Adapter Example**:

```typescript
// Auto-generated from diff between v1 and v2
export function adaptCreateUserV1ToV2(v1Args: unknown): Result<unknown> {
  const args = v1Args as Record<string, unknown>;
  return {
    ok: true,
    value: {
      full_name: args.name, // field rename
      email: args.email,
      age: args.age ?? 18, // new required field with default
      active: args.active === 'true', // type coercion
    },
  };
}
```

**WrapperConfig**:

```typescript
interface WrapperConfig {
  // Inject defaults for new required fields
  defaults?: Record<string, DefaultValueConfig>;
  // Custom field mappings beyond auto-detected renames
  mappings?: FieldMapping[];
  // Validate output against new schema
  validateOutput?: boolean;
}

interface FieldMapping {
  toolName: string;
  from: string;
  to: string;
  transform?: (value: unknown) => unknown;
}

interface DefaultValueConfig {
  toolName: string;
  fieldPath: string;
  value: unknown | (() => unknown);
}
```

### 3. Deprecation Manager (`packages/core/src/deprecation`)

**Purpose**: Annotate deprecations and enforce sunset timelines.

```typescript
interface DeprecationAnnotation {
  toolName: string;
  fieldPath: string;
  message: string;
  sunsetDate: Date;
  replacement?: string;
  migrationGuide?: string;
}

// Check if a call uses deprecated fields
function checkDeprecation(
  tools: Tool[],
  call: { toolName: string; args: unknown }
): DeprecationWarning[];

interface DeprecationWarning {
  toolName: string;
  fieldPath: string;
  message: string;
  sunsetDate: Date;
  daysRemaining: number;
}
```

Deprecation metadata is stored in a sidecar file (e.g., `tools.deprecations.json`) rather than polluting the Tool definition, since the MCP spec does not define deprecation fields.

### 4. Changelog Generator (`packages/core/src/changelog`)

**Purpose**: Generate human- and machine-readable changelogs from schema diffs.

```typescript
interface ChangelogEntry {
  version: SemVer;
  date: string;
  changes: ChangeSummary[];
  breaking: boolean;
  migrationRequired: boolean;
}

interface ChangeSummary {
  type: 'breaking' | 'feature' | 'fix' | 'deprecation';
  description: string;
  affectedTools: string[];
  migrationGuide?: string;
}

// Outputs
function toMarkdown(changelog: ChangelogEntry): string;
function toJson(changelog: ChangelogEntry): string;
```

### 5. CI/CD Integration (`packages/ci`)

**Purpose**: Fail builds on unacknowledged breaking changes.

**GitHub Action**:

```yaml
name: Schema Evolution Check
on:
  pull_request:
    paths: ['tools.snapshot.json', 'tools/*.json']

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reaatech/mcp-schema-evolution/ci@v1
        with:
          base-snapshot: 'tools.snapshot.json'
          fail-on-breaking: true
          acknowledgment-file: '.schema-breaking-allowed'
```

**Acknowledgment File**:

```
# .schema-breaking-allowed
# Format: TOOL_NAME|CHANGE_CATEGORY|DESCRIPTION

search|field_removed|Removed deprecated "query" parameter — replaced by "q" in v1.2.0
```

### 6. CLI (`packages/cli`)

**Purpose**: Developer interface for diffing, wrapping, and validation.

```bash
# Compare two snapshots
mcp-evolution diff tools.v1.json tools.v2.json

# Generate wrappers
mcp-evolution wrap --from tools.v1.json --to tools.v2.json --out ./wrappers/

# Validate current snapshot against policy
mcp-evolution validate tools.snapshot.json --policy evolution-policy.json

# Check deprecations
mcp-evolution check-deprecations tools.snapshot.json --deprecations tools.deprecations.json
```

## Data Flow

```
1. Snapshot Loading
   ┌──────────────┐    ┌──────────────┐
   │ Load Old     │───▶│ Load New     │
   │ Tool[]       │    │ Tool[]       │
   └──────────────┘    └──────────────┘

2. Diff & Classify
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Compare      │───▶│ Classify     │───▶│ Analyze      │
   │ Tool schemas │    │ Changes      │    │ Impact       │
   └──────────────┘    └──────────────┘    └──────────────┘

3. Wrapper Generation (if needed)
   ┌──────────────┐    ┌──────────────┐
   │ Generate     │───▶│ Validate     │
   │ Adapters     │    │ Against new  │
   │              │    │ schema       │
   └──────────────┘    └──────────────┘

4. Output
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Changelog    │    │ CI Report    │    │ Wrappers     │
   │ (.md, .json) │    │ (pass/fail)  │    │ (.ts, .js)   │
   └──────────────┘    └──────────────┘    └──────────────┘
```

## Error Handling Architecture

All core functions return `Result<T>` instead of throwing. This makes error paths explicit and testable.

```typescript
// Example usage
const result = diffToolSnapshots(v1, v2);
if (!result.ok) {
  console.error(result.error.code, result.error.message);
  process.exit(1);
}

// Errors are structured and actionable
const error = new EvolutionError({
  code: 'BREAKING_CHANGE_UNACKNOWLEDGED',
  message: 'Removed required field "email" from tool "createUser"',
  path: 'createUser.inputSchema.properties.email',
  suggestion: 'Add the field back as optional, or acknowledge in .schema-breaking-allowed',
});
```

## Configuration System

A single config file controls behavior:

```typescript
// mcp-evolution.config.ts
export default {
  snapshots: {
    current: './tools.snapshot.json',
    base: './tools.snapshot.base.json',
  },
  evolution: {
    allowBreaking: false,
    acknowledgmentRequired: true,
    acknowledgmentFile: '.schema-breaking-allowed',
  },
  rules: {
    'no-required-field-removal': 'error',
    'no-type-narrowing': 'error',
    'prefer-optional-fields': 'warn',
  },
  wrappers: {
    outputDir: './generated-wrappers',
    language: 'typescript',
    validateOutput: true,
  },
  deprecations: {
    file: './tools.deprecations.json',
    defaultSunsetPeriod: '180 days',
  },
} satisfies EvolutionConfig;
```

## Package Structure

```
mcp-schema-evolution/
├── packages/
│   ├── core/          # Diffing, wrapping, deprecation, changelog
│   ├── cli/           # Command-line interface
│   └── ci/            # GitHub Actions, validation reporters
├── tools.snapshot.json   # Example: committed tool snapshot
├── tools.deprecations.json
└── mcp-evolution.config.ts
```

## Performance Targets

| Operation                     | Target | Max Acceptable |
| ----------------------------- | ------ | -------------- |
| Diff 10 tools                 | <10ms  | <50ms          |
| Diff 100 tools                | <50ms  | <100ms         |
| Wrapper generation (10 tools) | <50ms  | <100ms         |
| Changelog generation          | <20ms  | <50ms          |
| Memory overhead               | <20MB  | <50MB          |

## Security Considerations

1. **Input Validation**: All snapshots are validated against JSON Schema Draft 2020-12 before processing.
2. **No Code Execution**: Wrappers are generated as static code, never `eval`'d.
3. **Safe Defaults**: The CLI defaults to `allowBreaking: false`.

## Future Extensibility (Post-v1)

1. **IDE Plugin**: Real-time schema validation in VS Code / JetBrains
2. **Schema Registry**: Centralized snapshot storage for multi-team organizations
3. **Custom Rules**: Pluggable rule engine for organization-specific policies
4. **Visual Diff**: Web UI for reviewing schema changes

---

This architecture is intentionally narrow for v1. It solves the MCP schema evolution problem without drifting into general-purpose schema management.
