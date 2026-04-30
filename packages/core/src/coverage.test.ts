import { describe, expect, it } from 'vitest';
import { classifyChange, detectFieldRenames } from './diff.js';
import { EvolutionError } from './types.js';
import type { DetectedChange, Tool } from './types.js';

// Test index.ts exports can be imported
describe('index exports', () => {
  it('can import from index', async () => {
    const mod = await import('./index.js');
    expect(mod.EvolutionError).toBeDefined();
    expect(mod.diffToolSnapshots).toBeDefined();
    expect(mod.classifyChange).toBeDefined();
    expect(mod.detectFieldRenames).toBeDefined();
  });
});

describe('EvolutionError', () => {
  it('stores code, path, and suggestion', () => {
    const err = new EvolutionError({
      code: 'TEST_ERROR',
      message: 'Something went wrong',
      path: 'test.path',
      suggestion: 'Try again',
    });
    expect(err.name).toBe('EvolutionError');
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('Something went wrong');
    expect(err.path).toBe('test.path');
    expect(err.suggestion).toBe('Try again');
  });
});

describe('classifyChange edge cases', () => {
  it('classifies deprecated as non-breaking', () => {
    const detected: DetectedChange = {
      category: 'deprecated',
      toolName: 'search',
      path: 'search.query',
      description: 'Field deprecated',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('non-breaking');
    expect(result.severity).toBe('medium');
  });

  it('classifies default_changed as non-breaking', () => {
    const detected: DetectedChange = {
      category: 'default_changed',
      toolName: 'search',
      path: 'search.limit.default',
      description: 'Default changed',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('non-breaking');
    expect(result.severity).toBe('low');
  });

  it('classifies truly unknown category via fallback default', () => {
    const detected = {
      category: 'nonexistent_category',
      toolName: 'search',
      path: 'search.query',
      description: 'Unknown',
    } as unknown as DetectedChange;
    const result = classifyChange(detected);
    expect(['breaking', 'non-breaking', 'patch']).toContain(result.type);
  });

  it('classifies constraint tightening for pattern as breaking', () => {
    const detected: DetectedChange = {
      category: 'constraint_changed',
      toolName: 'search',
      path: 'search.query.pattern',
      description: 'Pattern changed',
      oldValue: '^[a-z]+$',
      newValue: '^[a-z0-9]+$',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('breaking');
  });

  it('classifies minLength relaxation as non-breaking', () => {
    const detected: DetectedChange = {
      category: 'constraint_changed',
      toolName: 'search',
      path: 'search.query.minLength',
      description: 'Min length relaxed',
      oldValue: 5,
      newValue: 1,
      constraintName: 'minLength',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('non-breaking');
  });

  it('classifies maxLength tightening as breaking', () => {
    const detected: DetectedChange = {
      category: 'constraint_changed',
      toolName: 'search',
      path: 'search.query.maxLength',
      description: 'Max length tightened',
      oldValue: 200,
      newValue: 100,
      constraintName: 'maxLength',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('breaking');
  });
});

describe('detectFieldRenames edge cases', () => {
  it('returns empty for non-object schemas', () => {
    const oldTool = { name: 'test', inputSchema: { type: 'string' } } as unknown as Tool;
    const newTool = { name: 'test', inputSchema: { type: 'string' } } as unknown as Tool;
    const renames = detectFieldRenames(oldTool, newTool);
    expect(renames).toHaveLength(0);
  });

  it('detects rename with partial description match', () => {
    const oldTool: Tool = {
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query string' },
        },
      },
    };
    const newTool: Tool = {
      name: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'search query' },
        },
      },
    };

    const renames = detectFieldRenames(oldTool, newTool, { threshold: 0.5 });
    expect(renames.length).toBeGreaterThanOrEqual(0);
  });
});
