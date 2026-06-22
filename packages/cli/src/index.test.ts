import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDiff } from './commands/diff.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-evolution-cli-test-'));
}

const tool = (name: string, props: Record<string, unknown>, required?: string[]) => ({
  name,
  inputSchema: {
    type: 'object' as const,
    properties: props,
    ...(required ? { required } : {}),
  },
});

describe('runDiff', () => {
  it('returns 0 for identical snapshots', () => {
    const dir = tempDir();
    const snapshot = JSON.stringify([
      { name: 'search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    ]);
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, snapshot);
    writeFileSync(newPath, snapshot);

    const code = runDiff(oldPath, newPath);
    expect(code).toBe(0);

    rmSync(dir, { recursive: true });
  });

  it('returns 1 when breaking changes are detected', () => {
    const dir = tempDir();
    const oldSnap = JSON.stringify([
      { name: 'search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
    ]);
    const newSnap = JSON.stringify([]);
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, oldSnap);
    writeFileSync(newPath, newSnap);

    const code = runDiff(oldPath, newPath);
    expect(code).toBe(1);

    rmSync(dir, { recursive: true });
  });

  it('returns 1 for invalid JSON', () => {
    const dir = tempDir();
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, 'not json');
    writeFileSync(newPath, '[]');

    const code = runDiff(oldPath, newPath);
    expect(code).toBe(1);

    rmSync(dir, { recursive: true });
  });

  it('returns 1 for invalid JSON in new file', () => {
    const dir = tempDir();
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, '[]');
    writeFileSync(newPath, 'not json');

    const code = runDiff(oldPath, newPath);
    expect(code).toBe(1);

    rmSync(dir, { recursive: true });
  });

  it('returns 0 for non-breaking changes', () => {
    const dir = tempDir();
    const oldSnap = JSON.stringify([tool('search', { q: { type: 'string' } })]);
    const newSnap = JSON.stringify([
      tool('search', { q: { type: 'string' }, limit: { type: 'number' } }),
    ]);
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, oldSnap);
    writeFileSync(newPath, newSnap);

    const code = runDiff(oldPath, newPath);
    expect(code).toBe(0);

    rmSync(dir, { recursive: true });
  });

  it('returns 1 for breaking changes in JSON mode', () => {
    const dir = tempDir();
    const oldSnap = JSON.stringify([tool('search', { q: { type: 'string' } })]);
    const newSnap = JSON.stringify([]);
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, oldSnap);
    writeFileSync(newPath, newSnap);

    const code = runDiff(oldPath, newPath, { json: true });
    expect(code).toBe(1);

    rmSync(dir, { recursive: true });
  });

  it('returns 0 for non-breaking changes in JSON mode', () => {
    const dir = tempDir();
    const oldSnap = JSON.stringify([tool('search', { q: { type: 'string' } })]);
    const newSnap = JSON.stringify([
      tool('search', { q: { type: 'string' }, limit: { type: 'number' } }),
    ]);
    const oldPath = join(dir, 'old.json');
    const newPath = join(dir, 'new.json');
    writeFileSync(oldPath, oldSnap);
    writeFileSync(newPath, newSnap);

    const code = runDiff(oldPath, newPath, { json: true });
    expect(code).toBe(0);

    rmSync(dir, { recursive: true });
  });
});
