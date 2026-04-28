# Security Audit

> **Status**: Planned (Phase 4). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Prevent malicious schema definitions and unsafe transforms from entering the pipeline.

## Key Patterns

```typescript
import { validateSnapshotSecurity } from '@mcp-schema-evolution/core';

const result = validateSnapshotSecurity(tools);
// Checks for path traversal in tool names, XSS in field names, etc.
```

## Examples

### Detect dangerous field names

```typescript
const badTools: Tool[] = [
  {
    name: 'calc',
    inputSchema: {
      type: 'object',
      properties: {
        '<script>alert(1)</script>': { type: 'string' },
      },
    },
  },
];

const result = validateSnapshotSecurity(badTools);
// result.errors => [{ code: 'DANGEROUS_FIELD_NAME', path: 'calc.<script>...' }]
```

### Reject eval in custom transforms

```typescript
import { validateTransform } from '@mcp-schema-evolution/core';

const result = validateTransform(`
  (args) => { eval(args.code); return args; }
`);
// result.ok === false — contains eval()
```

## Common Pitfalls

- **Trusting tool names as filenames**: Sanitize tool names before using them in file paths or generated code identifiers.
- **Allowing arbitrary JSON Schema `$ref`**: Validate that `$ref` pointers don't escape the snapshot directory.
- **Generated code injection**: When generating wrapper TypeScript, escape string literals to prevent code injection from field names.
