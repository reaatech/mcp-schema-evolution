# Wrapper Generation

> **Status**: Planned (Phase 2). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Generate adapter functions that map old tool call arguments to new schema shapes.

## Key Patterns

```typescript
import { generateWrapper } from '@mcp-schema-evolution/core';
import type { Tool } from '@modelcontextprotocol/sdk';

const wrapper = generateWrapper(oldTools, newTools, changes, {
  validateOutput: true,
});

if (wrapper.ok) {
  const adaptCreateUser = wrapper.value['createUser'];
  const result = adaptCreateUser({ name: 'Ada' });
  // result.value => { full_name: 'Ada', age: 18 }
}
```

## Examples

### Field rename with default injection

```typescript
const changes = diffToolSnapshots(v1, v2); // detects name → full_name rename

const wrapper = generateWrapper(v1, v2, changes.value, {
  defaults: {
    createUser: {
      age: 18,
      country: 'US',
    },
  },
});
```

### Custom transform for type coercion

```typescript
const wrapper = generateWrapper(v1, v2, changes.value, {
  mappings: [
    {
      toolName: 'createUser',
      from: 'active',
      to: 'active',
      transform: (value) => value === 'true' || value === true,
    },
  ],
});
```

### Validate wrapper output against new schema

```typescript
const wrapper = generateWrapper(v1, v2, changes.value, {
  validateOutput: true, // runs JSON Schema validation post-adaptation
});

const result = wrapper.value['createUser']({ name: 'Ada' });
if (!result.ok) {
  // Validation failed — wrapper produced invalid args for v2
  console.error(result.error.message);
}
```

## Common Pitfalls

- **Lossy transforms**: Converting `string` → `number` can produce `NaN`. Always validate.
- **Circular mappings**: A → B and B → A creates infinite recursion. The generator detects this, but manual mappings can introduce it.
- **Missing defaults for new required fields**: If a new required field has no default and the old call doesn't provide it, the wrapper will fail validation.
