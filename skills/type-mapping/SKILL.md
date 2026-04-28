# Type Mapping

> **Status**: Planned (Phase 4). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Safe type coercion between JSON Schema types during wrapper generation and validation.

## Key Patterns

```typescript
import { coerceValue, analyzeCompatibility } from '@mcp-schema-evolution/core';

// Coerce a single value
const result = coerceValue('25', { from: 'string', to: 'number' });
// result.value === 25

// Check if a type change is safe
const compat = analyzeCompatibility({ type: 'integer' }, { type: 'number' });
// compat.safe === true (widening)
```

## Examples

### Safe vs unsafe conversions

```typescript
const safe = analyzeCompatibility({ type: 'string', format: 'date-time' }, { type: 'string' }); // safe === true (relaxing constraint)

const unsafe = analyzeCompatibility({ type: 'string' }, { type: 'number' }); // safe === false — requires explicit converter
```

### Register custom converter

```typescript
import { registerConverter } from '@mcp-schema-evolution/core';

registerConverter({
  from: 'string',
  to: 'custom-uuid',
  convert: (value) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(value))) {
      return { ok: false, error: new EvolutionError({ code: 'INVALID_UUID' }) };
    }
    return { ok: true, value: String(value) };
  },
});
```

## Common Pitfalls

- **NaN from string → number**: Always check `isNaN` after `parseInt`/`parseFloat`.
- **Precision loss**: `number` → `integer` truncates decimals. Flag as unsafe unless the source has `multipleOf: 1`.
- **Null handling**: Preserve `null` and `undefined` explicitly. Don't let them fall through to converters.
