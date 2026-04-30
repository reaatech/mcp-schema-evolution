import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyChange,
  detectFieldRenames,
  diffToolSnapshots,
  loadToolsFromFile,
} from './diff.js';
import type { DetectedChange, Tool } from './types.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-evolution-core-test-'));
}

function makeTool(name: string, properties: Record<string, unknown>, required?: string[]): Tool {
  return {
    name,
    inputSchema: {
      type: 'object',
      properties,
      ...(required ? { required } : {}),
    },
  };
}

describe('diffToolSnapshots', () => {
  it('returns empty changes for identical snapshots', () => {
    const tools: Tool[] = [makeTool('search', { query: { type: 'string' } })];

    const result = diffToolSnapshots(tools, tools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('detects added tools', () => {
    const oldTools: Tool[] = [];
    const newTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toMatchObject({
        category: 'tool_added',
        type: 'non-breaking',
        toolName: 'search',
      });
    }
  });

  it('detects removed tools', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];
    const newTools: Tool[] = [];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toMatchObject({
        category: 'tool_removed',
        type: 'breaking',
        toolName: 'search',
      });
    }
  });

  it('detects added optional fields as non-breaking', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];
    const newTools: Tool[] = [
      makeTool('search', { query: { type: 'string' }, limit: { type: 'number' } }),
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const added = result.value.find((c) => c.category === 'field_added');
      expect(added).toBeDefined();
      expect(added?.type).toBe('non-breaking');
    }
  });

  it('detects added required fields as breaking', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];
    const newTools: Tool[] = [
      makeTool('search', { query: { type: 'string' }, limit: { type: 'number' } }, ['limit']),
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const added = result.value.find((c) => c.category === 'field_added');
      expect(added).toBeDefined();
      expect(added?.type).toBe('breaking');
    }
  });

  it('detects removed fields', () => {
    const oldTools: Tool[] = [
      makeTool('search', { query: { type: 'string' }, limit: { type: 'number' } }),
    ];
    const newTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const removed = result.value.find((c) => c.category === 'field_removed');
      expect(removed).toBeDefined();
      expect(removed?.type).toBe('breaking');
    }
  });

  it('detects type changes', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];
    const newTools: Tool[] = [makeTool('search', { query: { type: 'number' } })];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const typeChange = result.value.find((c) => c.category === 'type_changed');
      expect(typeChange).toBeDefined();
      expect(typeChange?.type).toBe('breaking');
    }
  });

  it('detects required changes (optional → required)', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];
    const newTools: Tool[] = [makeTool('search', { query: { type: 'string' } }, ['query'])];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const reqChange = result.value.find((c) => c.category === 'required_changed');
      expect(reqChange).toBeDefined();
      expect(reqChange?.type).toBe('breaking');
    }
  });

  it('detects required changes (required → optional)', () => {
    const oldTools: Tool[] = [makeTool('search', { query: { type: 'string' } }, ['query'])];
    const newTools: Tool[] = [makeTool('search', { query: { type: 'string' } })];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const reqChange = result.value.find((c) => c.category === 'required_changed');
      expect(reqChange).toBeDefined();
      expect(reqChange?.type).toBe('non-breaking');
    }
  });

  it('detects constraint changes (enum narrowed)', () => {
    const oldTools: Tool[] = [
      makeTool('search', { sort: { type: 'string', enum: ['asc', 'desc', 'none'] } }),
    ];
    const newTools: Tool[] = [
      makeTool('search', { sort: { type: 'string', enum: ['asc', 'desc'] } }),
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const constraint = result.value.find((c) => c.category === 'constraint_changed');
      expect(constraint).toBeDefined();
      expect(constraint?.type).toBe('breaking');
    }
  });

  it('detects constraint changes (enum expanded)', () => {
    const oldTools: Tool[] = [
      makeTool('search', { sort: { type: 'string', enum: ['asc', 'desc'] } }),
    ];
    const newTools: Tool[] = [
      makeTool('search', { sort: { type: 'string', enum: ['asc', 'desc', 'none'] } }),
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const constraint = result.value.find((c) => c.category === 'constraint_changed');
      expect(constraint).toBeDefined();
      expect(constraint?.type).toBe('non-breaking');
    }
  });

  it('detects type changes inside nested object properties', () => {
    const oldTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                zip: { type: 'string' },
              },
            },
          },
        },
      },
    ];
    const newTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                zip: { type: 'number' },
              },
            },
          },
        },
      },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const typeChange = result.value.find(
        (c) => c.category === 'type_changed' && c.path.includes('.zip'),
      );
      expect(typeChange).toBeDefined();
      expect(typeChange?.type).toBe('breaking');
    }
  });

  it('detects nested field removal as breaking', () => {
    const oldTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
              },
            },
          },
        },
      },
    ];
    const newTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
          },
        },
      },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const removed = result.value.find(
        (c) => c.category === 'field_removed' && c.path.includes('.city'),
      );
      expect(removed).toBeDefined();
      expect(removed?.type).toBe('breaking');
    }
  });

  it('detects nested field addition as non-breaking', () => {
    const oldTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
          },
        },
      },
    ];
    const newTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
              },
            },
          },
        },
      },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const added = result.value.find(
        (c) => c.category === 'field_added' && c.path.includes('.city'),
      );
      expect(added).toBeDefined();
      expect(added?.type).toBe('non-breaking');
    }
  });

  it('detects type changes inside array items schema', () => {
    const oldTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    ];
    const newTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        },
      },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const typeChange = result.value.find(
        (c) => c.category === 'type_changed' && c.path.includes('.items.type'),
      );
      expect(typeChange).toBeDefined();
      expect(typeChange?.type).toBe('breaking');
    }
  });

  it('detects items schema with nested object properties', () => {
    const oldTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'number' },
                },
              },
            },
          },
        },
      },
    ];
    const newTools: Tool[] = [
      {
        name: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'number' },
                  pinned: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const added = result.value.find(
        (c) => c.category === 'field_added' && c.path.includes('.pinned'),
      );
      expect(added).toBeDefined();
    }
  });

  it('detects default value changes', () => {
    const oldTools: Tool[] = [makeTool('search', { limit: { type: 'number', default: 10 } })];
    const newTools: Tool[] = [makeTool('search', { limit: { type: 'number', default: 25 } })];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const defaultChange = result.value.find((c) => c.category === 'default_changed');
      expect(defaultChange).toBeDefined();
      expect(defaultChange?.type).toBe('non-breaking');
    }
  });

  it('detects non-object schema changes', () => {
    const oldTools: Tool[] = [
      { name: 'ping', inputSchema: { type: 'string' } as unknown as Tool['inputSchema'] },
    ];
    const newTools: Tool[] = [
      { name: 'ping', inputSchema: { type: 'number' } as unknown as Tool['inputSchema'] },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(1);
      const typeChange = result.value.find((c) => c.category === 'type_changed');
      expect(typeChange).toBeDefined();
    }
  });

  it('ignores identical non-object schemas', () => {
    const oldTools: Tool[] = [
      { name: 'ping', inputSchema: { type: 'string' } as unknown as Tool['inputSchema'] },
    ];
    const newTools: Tool[] = [
      { name: 'ping', inputSchema: { type: 'string' } as unknown as Tool['inputSchema'] },
    ];

    const result = diffToolSnapshots(oldTools, newTools);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

describe('loadToolsFromFile', () => {
  it('loads valid tools from a JSON file', () => {
    const dir = tempDir();
    const path = join(dir, 'tools.json');
    writeFileSync(path, JSON.stringify([{ name: 't', inputSchema: { type: 'object' } }]));

    const result = loadToolsFromFile(path);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe('t');
    }

    rmSync(dir, { recursive: true });
  });

  it('returns error for missing file', () => {
    const result = loadToolsFromFile('/nonexistent/path/tools.json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_READ_ERROR');
    }
  });

  it('returns error for invalid JSON', () => {
    const dir = tempDir();
    const path = join(dir, 'invalid.json');
    writeFileSync(path, 'not json');

    const result = loadToolsFromFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('JSON_PARSE_ERROR');
    }

    rmSync(dir, { recursive: true });
  });

  it('returns error for non-array root', () => {
    const dir = tempDir();
    const path = join(dir, 'obj.json');
    writeFileSync(path, JSON.stringify({ not: 'an-array' }));

    const result = loadToolsFromFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_FORMAT');
    }

    rmSync(dir, { recursive: true });
  });

  it('returns error for invalid tool definition', () => {
    const dir = tempDir();
    const path = join(dir, 'bad.json');
    writeFileSync(path, JSON.stringify([{ name: 't', inputSchema: { not_a_schema: true } }]));

    const result = loadToolsFromFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TOOL');
    }

    rmSync(dir, { recursive: true });
  });
});

describe('classifyChange', () => {
  it('classifies tool removal as breaking', () => {
    const detected: DetectedChange = {
      category: 'tool_removed',
      toolName: 'search',
      path: 'search',
      description: 'Tool removed',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('breaking');
    expect(result.severity).toBe('high');
  });

  it('classifies tool addition as non-breaking', () => {
    const detected: DetectedChange = {
      category: 'tool_added',
      toolName: 'search',
      path: 'search',
      description: 'Tool added',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('non-breaking');
  });

  it('classifies field removal as breaking', () => {
    const detected: DetectedChange = {
      category: 'field_removed',
      toolName: 'search',
      path: 'search.inputSchema.properties.query',
      description: 'Field removed',
    };
    const result = classifyChange(detected);
    expect(result.type).toBe('breaking');
  });
});

describe('detectFieldRenames', () => {
  it('detects a simple rename by type match', () => {
    const oldTool = makeTool('search', {
      query: { type: 'string', description: 'Search query' },
    });
    const newTool = makeTool('search', {
      q: { type: 'string', description: 'Search query' },
    });

    const renames = detectFieldRenames(oldTool, newTool, { threshold: 0.5 });
    expect(renames).toHaveLength(1);
    expect(renames[0]).toMatchObject({ from: 'query', to: 'q' });
  });

  it('returns empty when no match above threshold', () => {
    const oldTool = makeTool('search', {
      query: { type: 'string' },
    });
    const newTool = makeTool('search', {
      count: { type: 'number' },
    });

    const renames = detectFieldRenames(oldTool, newTool);
    expect(renames).toHaveLength(0);
  });

  it('integrates rename detection into diff (replaces remove+add with rename)', () => {
    const oldTools: Tool[] = [
      makeTool('search', {
        query: { type: 'string', description: 'Search query' },
      }),
    ];
    const newTools: Tool[] = [
      makeTool('search', {
        q: { type: 'string', description: 'Search query' },
      }),
    ];

    const result = diffToolSnapshots(oldTools, newTools, { renameThreshold: 0.5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const rename = result.value.find((c) => c.category === 'field_renamed');
      expect(rename).toBeDefined();
      expect(rename?.type).toBe('breaking');

      const removed = result.value.find((c) => c.category === 'field_removed');
      const added = result.value.find((c) => c.category === 'field_added');
      expect(removed).toBeUndefined();
      expect(added).toBeUndefined();
    }
  });
});
