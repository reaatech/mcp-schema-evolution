# Deprecation Management

> **Status**: Planned (Phase 2). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Track deprecated fields and tools with sunset timelines, and warn when deprecated elements are used.

## Key Patterns

Deprecations live in a sidecar file (`tools.deprecations.json`), not in the Tool definition itself, since the MCP spec has no deprecation field.

```typescript
import { loadDeprecations, checkDeprecation, isSunsetReached } from '@mcp-schema-evolution/core';

const deprecations = loadDeprecations('./tools.deprecations.json');

const warnings = checkDeprecation(
  tools,
  {
    toolName: 'search',
    args: { query: 'hello' },
  },
  deprecations
);

// warnings => [{ fieldPath: 'query', message: 'Use "q" instead', daysRemaining: 45 }]
```

## Examples

### Annotate a deprecation

```typescript
import { annotateDeprecation } from '@mcp-schema-evolution/core';

const updated = annotateDeprecation(deprecations, {
  toolName: 'search',
  fieldPath: 'query',
  message: 'Use "q" instead',
  sunsetDate: new Date('2025-12-31'),
  replacement: 'q',
});
```

### Block calls after sunset

```typescript
import { isSunsetReached } from '@mcp-schema-evolution/core';

for (const warning of warnings) {
  if (isSunsetReached(warning)) {
    throw new EvolutionError({
      code: 'DEPRECATION_SUNSET_REACHED',
      message: `${warning.fieldPath} was removed on ${warning.sunsetDate}`,
    });
  }
}
```

## Common Pitfalls

- **No replacement specified**: Always provide a `replacement` field so wrapper generation can auto-map.
- **Short sunset windows**: Give clients at least 90 days. The default is 180 days.
- **Forgetting to commit deprecations**: `tools.deprecations.json` must be in version control to be useful in CI.
