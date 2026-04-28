import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { diffToolSnapshots, classifyChange } from './diff.js';
import type { Tool, DetectedChange } from './types.js';

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

describe('diffToolSnapshots property-based', () => {
  it('always reports removing a required field as breaking', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (toolName, fieldName) => {
          const oldTools: Tool[] = [
            makeTool(toolName, { [fieldName]: { type: 'string' } }, [fieldName]),
          ];
          const newTools: Tool[] = [makeTool(toolName, {})];

          const result = diffToolSnapshots(oldTools, newTools);
          expect(result.ok).toBe(true);
          if (result.ok) {
            const breaking = result.value.filter(
              (c) => c.category === 'field_removed' && c.type === 'breaking'
            );
            expect(breaking.length).toBeGreaterThanOrEqual(1);
          }
        }
      )
    );
  });

  it('always reports adding a required field as breaking', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (toolName, fieldName) => {
          const oldTools: Tool[] = [makeTool(toolName, {})];
          const newTools: Tool[] = [
            makeTool(toolName, { [fieldName]: { type: 'string' } }, [fieldName]),
          ];

          const result = diffToolSnapshots(oldTools, newTools);
          expect(result.ok).toBe(true);
          if (result.ok) {
            const added = result.value.find((c) => c.category === 'field_added');
            expect(added).toBeDefined();
            expect(added!.type).toBe('breaking');
          }
        }
      )
    );
  });

  it('never reports changes for identical snapshots', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            fields: fc.array(
              fc.record({
                fieldName: fc.string({ minLength: 1, maxLength: 20 }),
                fieldType: fc.constantFrom('string', 'number', 'boolean'),
              })
            ),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (tools) => {
          const snapshot: Tool[] = tools.map((t) =>
            makeTool(
              t.name,
              Object.fromEntries(t.fields.map((f) => [f.fieldName, { type: f.fieldType }]))
            )
          );

          const result = diffToolSnapshots(snapshot, snapshot);
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value).toHaveLength(0);
          }
        }
      )
    );
  });

  it('always reports type change from string to number as breaking', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (toolName, fieldName) => {
          const oldTools: Tool[] = [makeTool(toolName, { [fieldName]: { type: 'string' } })];
          const newTools: Tool[] = [makeTool(toolName, { [fieldName]: { type: 'number' } })];

          const result = diffToolSnapshots(oldTools, newTools);
          expect(result.ok).toBe(true);
          if (result.ok) {
            const typeChange = result.value.find((c) => c.category === 'type_changed');
            expect(typeChange).toBeDefined();
            expect(typeChange!.type).toBe('breaking');
          }
        }
      )
    );
  });
});

describe('classifyChange invariants', () => {
  it('never classifies tool_removed as non-breaking', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (toolName, description) => {
          const detected: DetectedChange = {
            category: 'tool_removed',
            toolName,
            path: toolName,
            description,
          };
          const result = classifyChange(detected);
          expect(result.type).toBe('breaking');
        }
      )
    );
  });

  it('never classifies tool_added as breaking', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (toolName, description) => {
          const detected: DetectedChange = {
            category: 'tool_added',
            toolName,
            path: toolName,
            description,
          };
          const result = classifyChange(detected);
          expect(result.type).toBe('non-breaking');
        }
      )
    );
  });
});
