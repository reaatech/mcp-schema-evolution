# CI/CD Integration

> **Status**: Partially implemented. Basic validation and reporting available in `@mcp-schema-evolution/ci`.

## Purpose

Block builds on unacknowledged breaking changes and report schema evolution status in pull requests.

## Key Patterns

```typescript
import { validateSnapshot } from '@mcp-schema-evolution/ci';

const result = validateSnapshot({
  baseSnapshot: 'tools.snapshot.json', // from main branch
  headSnapshot: 'tools.snapshot.new.json', // from PR
  policy: {
    failOnBreaking: true,
    acknowledgmentFile: '.schema-breaking-allowed',
  },
});

// result.passed: boolean
// result.errors: ValidationError[]
```

## Examples

### GitHub Action workflow

```yaml
name: Schema Evolution Check
on:
  pull_request:
    paths: ['tools.snapshot.json', 'tools/**/*.json']

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: reaatech/mcp-schema-evolution/ci@v1
        with:
          base-snapshot: 'tools.snapshot.json'
          fail-on-breaking: true
          acknowledgment-file: '.schema-breaking-allowed'
```

### Acknowledgment file format

```
# .schema-breaking-allowed
# TOOL_NAME|CATEGORY|JUSTIFICATION

search|field_removed|Removed "query" — replaced by "q" in v1.2.0, all clients migrated
```

### Post PR comment with results

```typescript
import { formatReport } from '@mcp-schema-evolution/ci';

const comment = formatReport(result, { format: 'github-markdown' });
await github.rest.issues.createComment({
  owner,
  repo,
  issue_number: pr,
  body: comment,
});
```

## Common Pitfalls

- **Shallow clones**: `fetch-depth: 0` is required to access the base branch snapshot.
- **Path filters too broad**: Only run on PRs that touch tool definitions, not on every PR.
- **Acknowledgments without justification**: Every entry must explain _why_ the breaking change is acceptable.
