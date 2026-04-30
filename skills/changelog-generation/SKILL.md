# Changelog Generation

> **Status**: Planned (Phase 2). The API described here is aspirational and not yet implemented. See [DEV_PLAN.md](../../DEV_PLAN.md) for roadmap.

## Purpose

Transform schema diffs into human-readable changelogs with migration guidance.

## Key Patterns

```typescript
import { generateChangelog, toMarkdown } from '@reaatech/mcp-schema-evolution';

const changelog = generateChangelog({
  version: '2.0.0',
  date: new Date(),
  changes: diffResult.value,
});

const markdown = toMarkdown(changelog);
```

## Examples

### Generate changelog with migration guides

```typescript
const changelog = generateChangelog({
  version: '2.0.0',
  changes: diffResult.value,
  includeMigrationGuides: true,
  exampleLanguages: ['typescript', 'python'],
});

console.log(toMarkdown(changelog));
// ## 🔥 Breaking Changes
// - **search**: Renamed `query` to `q`
//   - Migration: `client.search({ q: old.query })`
```

### Suggest semantic version

```typescript
import { suggestVersion } from '@reaatech/mcp-schema-evolution';

const { version, bumpType } = suggestVersion('1.2.3', diffResult.value);
// version: '2.0.0', bumpType: 'major'
```

## Common Pitfalls

- **Too much detail**: Group related changes by tool. Don't emit one line per JSON Schema property change.
- **Missing breaking indicators**: Every breaking change must have a 🔥 or "BREAKING" prefix.
- **Stale migration examples**: If you change the schema again, update the migration code in the changelog template.
