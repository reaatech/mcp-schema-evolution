# Schema Diffing

> **Status**: Implemented. Core API available in `@mcp-schema-evolution/core`.

## Purpose

Compare two `Tool[]` snapshots and classify changes as breaking, non-breaking, or patch.

## Key Patterns

```typescript
import { diffToolSnapshots, classifyChange } from '@mcp-schema-evolution/core';
import type { Tool } from '@modelcontextprotocol/sdk';

const changes = diffToolSnapshots(oldTools, newTools);
// Returns Result<SchemaChange[]> — never throws

if (changes.ok) {
  const breaking = changes.value.filter((c) => c.type === 'breaking');
  const nonBreaking = changes.value.filter((c) => c.type === 'non-breaking');
}
```

## Examples

### Detect field renames automatically

```typescript
import { detectFieldRenames } from '@mcp-schema-evolution/core';

const renames = detectFieldRenames(oldTool, newTool, { threshold: 0.8 });
// [{ from: 'name', to: 'full_name', confidence: 0.95 }]
```

### Custom classification rule

```typescript
import { classifyChange } from '@mcp-schema-evolution/core';

const rule = (change: DetectedChange): ChangeType => {
  if (change.category === 'field_added' && change.fieldName === 'internal_id') {
    return 'patch'; // internal fields don't affect clients
  }
  return classifyChange(change);
};
```

### Property-based test for diffing

```typescript
import { it, expect } from 'vitest';
import fc from 'fast-check';
import { diffToolSnapshots } from '@mcp-schema-evolution/core';

it('should always detect a removed required field as breaking', () => {
  fc.assert(
    fc.property(toolArbitrary, (tool) => {
      const modified = removeRequiredField(tool);
      const result = diffToolSnapshots([tool], [modified]);
      expect(
        result.ok &&
          result.value.some((c) => c.type === 'breaking' && c.category === 'field_removed')
      ).toBe(true);
    })
  );
});
```

## Common Pitfalls

- **Not checking `Result.ok`**: Always handle the error branch. `diffToolSnapshots` can fail on invalid JSON Schema input.
- **Ignoring nested schemas**: Changes inside `items` or `properties` of a field must be recursively checked.
- **False positives on renames**: Two unrelated fields with similar types may be flagged. Use `confidence` threshold or explicit mappings.
