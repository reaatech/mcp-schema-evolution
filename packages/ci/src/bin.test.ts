import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from './bin.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-evolution-ci-bin-test-'));
}

function createSimpleSnapshots(): [string, string, string] {
  const dir = tempDir();
  const tool = { name: 't', inputSchema: { type: 'object', properties: {} } };
  const base = join(dir, 'base.json');
  const head = join(dir, 'head.json');
  writeFileSync(base, JSON.stringify([tool]));
  writeFileSync(head, JSON.stringify([tool]));
  return [base, head, dir];
}

function mockProcess() {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  return { exitSpy, logSpy, errorSpy };
}

describe('bin.ts argument parsing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows help with --help flag', () => {
    const { exitSpy } = mockProcess();
    main(['--help']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('shows help with -h flag', () => {
    const { exitSpy } = mockProcess();
    main(['-h']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('shows error when --base is missing', () => {
    const { exitSpy, errorSpy } = mockProcess();
    main(['--head', 'h.json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('shows error when --head is missing', () => {
    const { exitSpy } = mockProcess();
    main(['--base', 'b.json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('runs validation with valid arguments and exits 0 for identical snapshots', () => {
    const [basePath, headPath, dir] = createSimpleSnapshots();
    const { exitSpy } = mockProcess();

    main(['--base', basePath, '--head', headPath]);
    expect(exitSpy).toHaveBeenCalledWith(0);

    rmSync(dir, { recursive: true });
  });

  it('exits with code 1 on breaking changes', () => {
    const dir = tempDir();
    const baseTool = {
      name: 'search',
      inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
    };
    const base = join(dir, 'base.json');
    const head = join(dir, 'head.json');
    writeFileSync(base, JSON.stringify([baseTool]));
    writeFileSync(head, JSON.stringify([]));
    const { exitSpy } = mockProcess();

    main(['--base', base, '--head', head]);
    expect(exitSpy).toHaveBeenCalledWith(1);

    rmSync(dir, { recursive: true });
  });

  it('uses github-markdown format when specified', () => {
    const [basePath, headPath, dir] = createSimpleSnapshots();
    const { exitSpy } = mockProcess();

    main(['--base', basePath, '--head', headPath, '--format', 'github-markdown']);
    expect(exitSpy).toHaveBeenCalledWith(0);

    rmSync(dir, { recursive: true });
  });

  it('falls back to text format for unknown format value', () => {
    const [basePath, headPath, dir] = createSimpleSnapshots();
    const { exitSpy } = mockProcess();

    main(['--base', basePath, '--head', headPath, '--format', 'xml']);
    expect(exitSpy).toHaveBeenCalledWith(0);

    rmSync(dir, { recursive: true });
  });
});
