import { describe, it, expect } from 'vitest';
import { validateSnapshot, formatReport } from './validate.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-evolution-ci-test-'));
}

describe('validateSnapshot', () => {
  it('passes for identical snapshots', () => {
    const dir = tempDir();
    const snap = JSON.stringify([
      { name: 'search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    ]);
    const base = join(dir, 'base.json');
    const head = join(dir, 'head.json');
    writeFileSync(base, snap);
    writeFileSync(head, snap);

    const result = validateSnapshot({ baseSnapshot: base, headSnapshot: head });
    expect(result.ok).toBe(true);
    expect(result.changes).toHaveLength(0);

    rmSync(dir, { recursive: true });
  });

  it('fails on breaking changes when failOnBreaking is true', () => {
    const dir = tempDir();
    const baseSnap = JSON.stringify([
      { name: 'search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    ]);
    const headSnap = JSON.stringify([]);
    const base = join(dir, 'base.json');
    const head = join(dir, 'head.json');
    writeFileSync(base, baseSnap);
    writeFileSync(head, headSnap);

    const result = validateSnapshot({ baseSnapshot: base, headSnapshot: head });
    expect(result.ok).toBe(false);
    expect(result.breakingCount).toBeGreaterThan(0);

    rmSync(dir, { recursive: true });
  });

  it('passes when breaking changes are acknowledged', () => {
    const dir = tempDir();
    const baseSnap = JSON.stringify([
      { name: 'search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    ]);
    const headSnap = JSON.stringify([]);
    const base = join(dir, 'base.json');
    const head = join(dir, 'head.json');
    const ack = join(dir, '.schema-breaking-allowed');
    writeFileSync(base, baseSnap);
    writeFileSync(head, headSnap);
    writeFileSync(ack, 'search|tool_removed|\n');

    const result = validateSnapshot({
      baseSnapshot: base,
      headSnapshot: head,
      policy: { failOnBreaking: true, acknowledgmentFile: ack },
    });
    expect(result.ok).toBe(true);
    expect(result.acknowledged).toBe(true);

    rmSync(dir, { recursive: true });
  });
});

describe('formatReport', () => {
  it('returns markdown for github-markdown format', () => {
    const result = {
      ok: true,
      changes: [],
      breakingCount: 0,
      acknowledged: false,
    };
    const report = formatReport(result, { format: 'github-markdown' });
    expect(report).toContain('Schema Validation Passed');
  });

  it('returns plain text for text format', () => {
    const result = {
      ok: true,
      changes: [],
      breakingCount: 0,
      acknowledged: false,
    };
    const report = formatReport(result, { format: 'text' });
    expect(report).toContain('Schema validation passed');
  });
});
