# @reaatech/mcp-schema-evolution-cli

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-schema-evolution-cli.svg)](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-schema-evolution/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-schema-evolution/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Command-line interface for MCP schema evolution. Compare tool snapshots, detect breaking changes, and integrate into CI pipelines with machine-readable JSON output.

## Installation

```bash
npm install -g @reaatech/mcp-schema-evolution-cli
# or
pnpm add -g @reaatech/mcp-schema-evolution-cli
```

For per-project usage:

```bash
npm install --save-dev @reaatech/mcp-schema-evolution-cli
# or
pnpm add -D @reaatech/mcp-schema-evolution-cli
```

## Feature Overview

- **Schema diffing** — compare two tool snapshot JSON files and classify all changes
- **Dual output modes** — human-readable text with color icons for developers, machine-readable JSON for CI
- **Exit codes** — 0 on success (no breaking changes), 1 on breaking changes or errors
- **Comprehensive error reporting** — clear, actionable error messages with suggestions

## Quick Start

```bash
# Compare two snapshots
mcp-evolution diff tools.v1.json tools.v2.json

# JSON output (for CI pipelines)
mcp-evolution diff tools.v1.json tools.v2.json --json

# Use in scripts
mcp-evolution diff old.json new.json && echo "Safe to deploy!" || echo "Breaking changes detected!"
```

## API Reference

### `mcp-evolution diff <old> <new> [options]`

Compares two tool snapshot JSON files and reports detected schema changes.

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<old>` | Yes | Path to the old tool snapshot JSON file |
| `<new>` | Yes | Path to the new tool snapshot JSON file |

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean (presence) | `false` | Output results as machine-readable JSON |

### Output Formats

#### Text Output (default)

```
Detected 3 change(s):

🔴 [HIGH] tool_removed: Tool "legacy_search" was removed.
   → Remove usages of "legacy_search" or migrate to a replacement tool.
🟡 [MEDIUM] field_added: Field "limit" was added to search (optional)
   → No action needed; the new field is optional.
🔴 [HIGH] field_renamed: Field "query" was renamed to "q" in search
   → Update references from "query" to "q". Use a wrapper to map old field names to new ones.

⚠️  2 breaking change(s) found.
```

- 🔴 = breaking change
- 🟡 = non-breaking change
- 🔵 = patch
- Migration suggestions are prefixed with `→`

#### JSON Output (`--json`)

```json
{
  "ok": true,
  "changes": [
    {
      "type": "breaking",
      "category": "tool_removed",
      "toolName": "legacy_search",
      "path": "",
      "description": "Tool \"legacy_search\" was removed.",
      "severity": "high",
      "migration": {
        "suggestion": "Remove usages of \"legacy_search\" or migrate to a replacement tool.",
        "automated": false
      }
    }
  ]
}
```

Error output in JSON mode:

```json
{
  "ok": false,
  "error": "File not found: snapshots/tools.json"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No breaking changes detected (0 changes or only non-breaking changes) |
| `1` | Breaking changes detected, or an error occurred (file not found, invalid JSON, etc.) |

In JSON mode, exit code 1 is returned if any change has `type: "breaking"`, even when `ok` is `true`.

### Input File Format

Tool snapshots are JSON arrays of MCP tool definitions:

```json
[
  {
    "name": "search",
    "description": "Search the index",
    "inputSchema": {
      "type": "object",
      "properties": {
        "q": { "type": "string", "description": "Search query" },
        "limit": { "type": "integer", "default": 10 }
      },
      "required": ["q"]
    }
  }
]
```

Each tool must have a `name` (string) and an `inputSchema` with a `type` (string).

### Error Messages

| Error Code | Message |
|------------|---------|
| `FILE_READ_ERROR` | File not found or cannot be read |
| `JSON_PARSE_ERROR` | File contains invalid JSON |
| `INVALID_FORMAT` | Root element is not an array |
| `INVALID_TOOL` | An element does not match the expected Tool shape |
| `DIFF_ERROR` | Internal error during schema comparison |

## CI Integration

```bash
# Fail CI on breaking changes
mcp-evolution diff snapshots/base.json snapshots/head.json --json || exit 1

# Capture JSON output for reporting
mcp-evolution diff snapshots/base.json snapshots/head.json --json > report.json
```

## Related Packages

- [`@reaatech/mcp-schema-evolution`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution) — Core diffing engine
- [`@reaatech/mcp-schema-evolution-ci`](https://www.npmjs.com/package/@reaatech/mcp-schema-evolution-ci) — CI validation with policy enforcement and PR reporting

## License

[MIT](https://github.com/reaatech/mcp-schema-evolution/blob/main/LICENSE)
