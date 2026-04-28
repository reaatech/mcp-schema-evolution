# Performance Optimization

> **Status**: Planned (Phase 4). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Keep schema operations fast and memory-efficient. Targets: diff <50ms for 100 tools, wrappers <50ms for 10 tools, <20MB overhead.

## Key Patterns

```typescript
import { diffToolSnapshots } from '@mcp-schema-evolution/core';

// Use caching for repeated diffs against the same base
const result = diffToolSnapshots(oldTools, newTools, {
  cacheKey: 'base-snapshot-v1',
});
```

## Examples

### Benchmark a diff operation

```typescript
import { bench, describe } from 'vitest';
import { diffToolSnapshots } from '@mcp-schema-evolution/core';

describe('diff performance', () => {
  bench(
    'diff 100 tools',
    () => {
      diffToolSnapshots(toolsV1, toolsV2);
    },
    { time: 1000 }
  );
});
```

### Profile memory during wrapper generation

```typescript
const before = process.memoryUsage().heapUsed;
const wrapper = generateWrapper(v1, v2, changes.value);
const after = process.memoryUsage().heapUsed;

console.log(`Memory delta: ${(after - before) / 1024 / 1024}MB`);
```

## Common Pitfalls

- **Re-parsing the same schema**: Cache parsed JSON Schema objects. Parsing is expensive.
- **Deep cloning large schemas**: Use structural sharing or immutable updates instead of `structuredClone` on the entire tool list.
- **Unbounded caching**: Set a max size on any schema cache to avoid memory leaks.
