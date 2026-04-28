import { readFileSync } from 'node:fs';
import {
  EvolutionError,
  type EvolutionErrorOptions,
  type Tool,
  type Result,
  type DetectedChange,
  type SchemaChange,
  type ChangeType,
  type FieldRename,
  type DiffOptions,
  type MigrationGuidance,
} from './types.js';

function isTool(value: unknown): value is Tool {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.inputSchema !== 'object' || obj.inputSchema === null) return false;
  const schema = obj.inputSchema as Record<string, unknown>;
  return typeof schema.type === 'string';
}

function validateToolArray(parsed: unknown, path: string): Result<Tool[]> {
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: new EvolutionError({
        code: 'INVALID_FORMAT',
        message: `Expected JSON array of tools in ${path}`,
        path,
        suggestion: 'The snapshot file must contain a JSON array of tool definitions.',
      }),
    };
  }

  const invalidIndex = (parsed as unknown[]).findIndex((item) => !isTool(item));
  if (invalidIndex !== -1) {
    return {
      ok: false,
      error: new EvolutionError({
        code: 'INVALID_TOOL',
        message: `Invalid tool definition at index ${invalidIndex} in ${path}`,
        path,
        suggestion:
          'Each tool must have a string "name" and an "inputSchema" object with a string "type".',
      }),
    };
  }

  return { ok: true, value: parsed as Tool[] };
}

interface JSONSchemaProperty {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
  [key: string]: unknown;
}

interface InputSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

function isObjectSchema(schema: unknown): schema is InputSchema {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'type' in schema &&
    (schema as Record<string, unknown>).type === 'object'
  );
}

/**
 * Load and validate a tool snapshot from a JSON file on disk.
 *
 * @param path - Path to the JSON file containing an array of Tool objects
 * @returns A Result containing the parsed Tool array or an EvolutionError
 */
export function loadToolsFromFile(path: string): Result<Tool[]> {
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: new EvolutionError({
        code: 'FILE_READ_ERROR',
        message: `Failed to read snapshot file: ${message}`,
        path,
        suggestion: 'Verify the file path exists and is readable.',
      }),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: new EvolutionError({
        code: 'JSON_PARSE_ERROR',
        message: `Failed to parse JSON in ${path}: ${message}`,
        path,
        suggestion: 'Verify the snapshot file contains valid JSON.',
      }),
    };
  }

  return validateToolArray(parsed, path);
}

/**
 * Deep equality check for JSON-serializable values.
 * More robust than JSON.stringify because it is not sensitive to key ordering.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}

/**
 * Compare two tool snapshots and return a list of classified schema changes.
 *
 * @param oldTools - The previous tool snapshot
 * @param newTools - The current tool snapshot
 * @param options - Optional configuration for diffing behaviour
 * @returns A Result containing the list of changes or an EvolutionError
 */
export function diffToolSnapshots(
  oldTools: Tool[],
  newTools: Tool[],
  options?: DiffOptions
): Result<SchemaChange[]> {
  try {
    const changes: SchemaChange[] = [];

    const oldMap = new Map(oldTools.map((t) => [t.name, t]));
    const newMap = new Map(newTools.map((t) => [t.name, t]));

    // Detect removed tools
    for (const [name, tool] of oldMap) {
      if (!newMap.has(name)) {
        const detected: DetectedChange = {
          category: 'tool_removed',
          toolName: name,
          path: name,
          description: `Tool "${name}" was removed`,
          oldValue: tool,
        };
        const classified = classifyChange(detected);
        changes.push(classified);
      }
    }

    // Detect added tools
    for (const [name, tool] of newMap) {
      if (!oldMap.has(name)) {
        const detected: DetectedChange = {
          category: 'tool_added',
          toolName: name,
          path: name,
          description: `Tool "${name}" was added`,
          newValue: tool,
        };
        const classified = classifyChange(detected);
        changes.push(classified);
      }
    }

    // Diff tools present in both
    for (const [name, oldTool] of oldMap) {
      const newTool = newMap.get(name);
      if (newTool) {
        const toolChanges = diffTool(oldTool, newTool, options);
        changes.push(...toolChanges);
      }
    }

    return { ok: true, value: changes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const source = err instanceof EvolutionError ? err.code : 'DIFF_ERROR';
    const suggestion =
      err instanceof EvolutionError
        ? err.suggestion
        : 'This may indicate a bug in the diff engine or malformed tool schemas.';

    return {
      ok: false,
      error: new EvolutionError({
        code: source,
        message: `Schema diffing failed: ${message}`,
        ...(suggestion !== undefined ? { suggestion } : {}),
      } as EvolutionErrorOptions),
    };
  }
}

function diffTool(oldTool: Tool, newTool: Tool, options?: DiffOptions): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldSchema = oldTool.inputSchema;
  const newSchema = newTool.inputSchema;

  if (!isObjectSchema(oldSchema) || !isObjectSchema(newSchema)) {
    // Non-object schemas: just compare for equality at top level
    if (!deepEqual(oldSchema, newSchema)) {
      const detected: DetectedChange = {
        category: 'type_changed',
        toolName: oldTool.name,
        path: `${oldTool.name}.inputSchema`,
        description: `Input schema for "${oldTool.name}" changed significantly`,
        oldValue: oldSchema,
        newValue: newSchema,
      };
      changes.push(classifyChange(detected));
    }
  return changes;
}

  const oldProps = oldSchema.properties ?? {};
  const newProps = newSchema.properties ?? {};
  const oldRequired = new Set(oldSchema.required ?? []);
  const newRequired = new Set(newSchema.required ?? []);

  const removedFields: string[] = [];
  const addedFields: string[] = [];

  // Detect removed fields
  for (const fieldName of Object.keys(oldProps)) {
    if (!Object.prototype.hasOwnProperty.call(newProps, fieldName)) {
      removedFields.push(fieldName);
    }
  }

  // Detect added fields
  for (const fieldName of Object.keys(newProps)) {
    if (!Object.prototype.hasOwnProperty.call(oldProps, fieldName)) {
      addedFields.push(fieldName);
    }
  }

  // Detect renames before emitting remove/add
  const renameOpts =
    options?.renameThreshold !== undefined ? { threshold: options.renameThreshold } : undefined;
  const renames = detectFieldRenames(oldTool, newTool, renameOpts);

  const renamedFrom = new Set<string>();
  const renamedTo = new Set<string>();

  for (const rename of renames) {
    if (removedFields.includes(rename.from) && addedFields.includes(rename.to)) {
      renamedFrom.add(rename.from);
      renamedTo.add(rename.to);

      const detected: DetectedChange = {
        category: 'field_renamed',
        toolName: oldTool.name,
        path: `${oldTool.name}.inputSchema.properties.${rename.from}`,
        description: `Field "${rename.from}" was renamed to "${rename.to}" in "${oldTool.name}"`,
        oldValue: rename.from,
        newValue: rename.to,
      };
      changes.push(classifyChange(detected));
    }
  }

  // Emit removed fields (excluding renamed ones)
  for (const fieldName of removedFields) {
    if (renamedFrom.has(fieldName)) continue;
    const oldProp = oldProps[fieldName];
    const detected: DetectedChange = {
      category: 'field_removed',
      toolName: oldTool.name,
      path: `${oldTool.name}.inputSchema.properties.${fieldName}`,
      description: `Field "${fieldName}" was removed from "${oldTool.name}"`,
      oldValue: oldProp,
    };
    changes.push(classifyChange(detected));
  }

  // Emit added fields (excluding renamed ones)
  for (const fieldName of addedFields) {
    if (renamedTo.has(fieldName)) continue;
    const newProp = newProps[fieldName];
    const detected: DetectedChange = {
      category: 'field_added',
      toolName: oldTool.name,
      path: `${oldTool.name}.inputSchema.properties.${fieldName}`,
      description: `Field "${fieldName}" was added to "${oldTool.name}"`,
      newValue: newProp,
      required: newRequired.has(fieldName),
    };
    changes.push(classifyChange(detected));
  }

  // Compare existing fields
  for (const [fieldName, oldProp] of Object.entries(oldProps)) {
    const newProp = newProps[fieldName];
    if (newProp) {
      const fieldChanges = diffProperty(
        oldTool.name,
        fieldName,
        oldProp,
        newProp,
        oldRequired.has(fieldName),
        newRequired.has(fieldName)
      );
      changes.push(...fieldChanges);
    }
  }

  return changes;
}

function diffProperty(
  toolName: string,
  fieldName: string,
  oldProp: JSONSchemaProperty,
  newProp: JSONSchemaProperty,
  oldRequired: boolean,
  newRequired: boolean,
  basePathOverride?: string
): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const basePath = basePathOverride ?? `${toolName}.inputSchema.properties.${fieldName}`;

  // Type change
  if (!deepEqual(oldProp.type, newProp.type)) {
    const detected: DetectedChange = {
      category: 'type_changed',
      toolName,
      path: `${basePath}.type`,
      description: `Type of "${fieldName}" changed from ${JSON.stringify(oldProp.type)} to ${JSON.stringify(newProp.type)}`,
      oldValue: oldProp.type,
      newValue: newProp.type,
    };
    changes.push(classifyChange(detected));
  }

  // Required change
  if (oldRequired !== newRequired) {
    const detected: DetectedChange = {
      category: 'required_changed',
      toolName,
      path: `${basePath}`,
      description: `"${fieldName}" ${newRequired ? 'became required' : 'became optional'}`,
      oldValue: oldRequired,
      newValue: newRequired,
    };
    changes.push(classifyChange(detected));
  }

  // Default change
  if (!deepEqual(oldProp.default, newProp.default)) {
    const detected: DetectedChange = {
      category: 'default_changed',
      toolName,
      path: `${basePath}.default`,
      description: `Default value of "${fieldName}" changed`,
      oldValue: oldProp.default,
      newValue: newProp.default,
    };
    changes.push(classifyChange(detected));
  }

  // Constraint changes
  const constraintFields: Array<keyof JSONSchemaProperty> = [
    'enum',
    'minLength',
    'maxLength',
    'pattern',
    'minimum',
    'maximum',
    'minItems',
    'maxItems',
  ];

  for (const constraint of constraintFields) {
    if (!deepEqual(oldProp[constraint], newProp[constraint])) {
      const detected: DetectedChange = {
        category: 'constraint_changed',
        toolName,
        path: `${basePath}.${String(constraint)}`,
        description: formatConstraintDescription(
          String(constraint),
          fieldName,
          oldProp[constraint],
          newProp[constraint]
        ),
        oldValue: oldProp[constraint],
        newValue: newProp[constraint],
        constraintName: String(constraint),
      };
      changes.push(classifyChange(detected));
    }
  }

  // Recurse into nested object properties
  const oldNested = oldProp.properties;
  const newNested = newProp.properties;
  if (oldNested || newNested) {
    const oldEntries = oldNested ?? {};
    const newEntries = newNested ?? {};
    const nestedPath = `${basePath}.properties`;

    const nestedChanges = diffNestedProperties(
      toolName,
      nestedPath,
      oldEntries,
      newEntries
    );
    changes.push(...nestedChanges);
  }

  // Recurse into array items schemas
  const oldItems = oldProp.items;
  const newItems = newProp.items;
  if (oldItems && newItems) {
    const nestedPath = `${basePath}.items`;
    const itemChanges = diffProperty(
      toolName,
      'items',
      oldItems,
      newItems,
      false,
      false,
      nestedPath
    );
    changes.push(...itemChanges);
  }

  return changes;
}

function diffNestedProperties(
  toolName: string,
  basePath: string,
  oldProps: Record<string, JSONSchemaProperty>,
  newProps: Record<string, JSONSchemaProperty>
): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const oldKeys = new Set(Object.keys(oldProps));
  const newKeys = new Set(Object.keys(newProps));

  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      const detected: DetectedChange = {
        category: 'field_removed',
        toolName,
        path: `${basePath}.${key}`,
        description: `Nested field "${key}" was removed from "${toolName}"`,
        oldValue: oldProps[key],
      };
      changes.push(classifyChange(detected));
    }
  }

  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      const detected: DetectedChange = {
        category: 'field_added',
        toolName,
        path: `${basePath}.${key}`,
        description: `Nested field "${key}" was added to "${toolName}"`,
        newValue: newProps[key],
      };
      changes.push(classifyChange(detected));
    }
  }

  for (const key of oldKeys) {
    const oldProp = oldProps[key];
    const newProp = newProps[key];
    if (oldProp && newProp && newKeys.has(key)) {
      changes.push(
        ...diffProperty(toolName, key, oldProp, newProp, false, false, `${basePath}.${key}`)
      );
    }
  }

  return changes;
}

/**
 * Classify a raw detected change into a fully classified SchemaChange.
 *
 * @param detected - The raw change detected by the diff engine
 * @returns A SchemaChange with type, severity, and migration guidance
 */
export function classifyChange(detected: DetectedChange): SchemaChange {
  const { category, toolName, path, description, oldValue, newValue } = detected;

  let type: ChangeType;
  let severity: 'high' | 'medium' | 'low';
  let migration: MigrationGuidance | undefined;

  switch (category) {
    case 'tool_removed': {
      type = 'breaking';
      severity = 'high';
      migration = {
        suggestion: `Remove all usages of "${toolName}" or migrate to a replacement tool`,
        automated: false,
      };
      break;
    }
    case 'tool_added': {
      type = 'non-breaking';
      severity = 'low';
      migration = undefined;
      break;
    }
    case 'field_removed': {
      type = 'breaking';
      severity = 'high';
      migration = {
        suggestion: `Remove references to "${path.split('.').pop()}" or use a wrapper to map to a replacement field`,
        automated: false,
      };
      break;
    }
    case 'field_added': {
      const isRequired = detected.required === true;
      if (isRequired) {
        type = 'breaking';
        severity = 'high';
        migration = {
          suggestion: `Provide a value for the new required field "${path.split('.').pop()}"`,
          automated: true,
        };
      } else {
        type = 'non-breaking';
        severity = 'medium';
        migration = {
          suggestion: `No action needed; new field is optional`,
          automated: true,
        };
      }
      break;
    }
    case 'field_renamed': {
      type = 'breaking';
      severity = 'high';
      migration = {
        suggestion: `Update references to use the new field name`,
        automated: true,
      };
      break;
    }
    case 'type_changed': {
      type = 'breaking';
      severity = 'high';
      migration = {
        suggestion: `Update values to match the new type`,
        automated: true,
      };
      break;
    }
    case 'required_changed': {
      const becameRequired = newValue === true;
      type = becameRequired ? 'breaking' : 'non-breaking';
      severity = becameRequired ? 'high' : 'medium';
      migration = becameRequired
        ? { suggestion: `Provide a value for the now-required field`, automated: true }
        : { suggestion: `No action needed`, automated: true };
      break;
    }
    case 'default_changed': {
      type = 'non-breaking';
      severity = 'low';
      migration = undefined;
      break;
    }
    case 'constraint_changed': {
      const tightened = isConstraintTightened(
        detected.constraintName ?? '',
        oldValue,
        newValue
      );
      type = tightened ? 'breaking' : 'non-breaking';
      severity = tightened ? 'high' : 'medium';
      migration = {
        suggestion: tightened
          ? `Ensure values comply with the stricter constraint`
          : `No action needed`,
        automated: false,
      };
      break;
    }
    case 'deprecated': {
      type = 'non-breaking';
      severity = 'medium';
      migration = {
        suggestion: `Migrate away from the deprecated field before its sunset date`,
        automated: false,
      };
      break;
    }
    default: {
      type = 'non-breaking';
      severity = 'low';
    }
  }

  const result: SchemaChange = {
    type,
    category,
    toolName,
    path,
    description,
    severity,
  };

  if (migration !== undefined) {
    result.migration = migration;
  }

  return result;
}

function isConstraintTightened(
  constraintName: string,
  oldValue: unknown,
  newValue: unknown
): boolean {
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    if (oldValue === newValue) return false;

    switch (constraintName) {
      case 'minLength':
      case 'minimum':
      case 'minItems':
        return newValue > oldValue;
      case 'maxLength':
      case 'maximum':
      case 'maxItems':
        return newValue < oldValue;
      default:
        return false;
    }
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return (newValue as unknown[]).length < (oldValue as unknown[]).length;
  }

  return !deepEqual(oldValue, newValue);
}

function formatConstraintDescription(
  constraintName: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown
): string {
  const oldStr = JSON.stringify(oldValue);
  const newStr = JSON.stringify(newValue);
  const direction = isConstraintTightened(constraintName, oldValue, newValue)
    ? 'tightened'
    : 'relaxed';
  return `Constraint "${constraintName}" on "${fieldName}" ${direction} from ${oldStr} to ${newStr}`;
}

/**
 * Detect potential field renames between two versions of a tool by comparing
 * removed and added fields using a similarity heuristic.
 *
 * @param oldTool - The previous version of the tool
 * @param newTool - The current version of the tool
 * @param options - Optional threshold for rename confidence (default 0.8)
 * @returns A list of probable field renames with confidence scores
 */
export function detectFieldRenames(
  oldTool: Tool,
  newTool: Tool,
  options?: { threshold?: number }
): FieldRename[] {
  const threshold = options?.threshold ?? 0.8;
  const renames: FieldRename[] = [];

  const oldSchema = oldTool.inputSchema;
  const newSchema = newTool.inputSchema;

  if (!isObjectSchema(oldSchema) || !isObjectSchema(newSchema)) {
    return renames;
  }

  const oldProps = oldSchema.properties ?? {};
  const newProps = newSchema.properties ?? {};

  const oldFields = Object.keys(oldProps);
  const newFields = Object.keys(newProps);

  const removedFields = oldFields.filter((f) => !newFields.includes(f));
  const addedFields = newFields.filter((f) => !oldFields.includes(f));

  for (const removed of removedFields) {
    const oldProp = oldProps[removed] as JSONSchemaProperty;

    for (const added of addedFields) {
      const newProp = newProps[added] as JSONSchemaProperty;

      const confidence = calculateSimilarity(oldProp, newProp);
      if (confidence >= threshold) {
        renames.push({ from: removed, to: added, confidence });
      }
    }
  }

  return renames;
}

function calculateSimilarity(oldProp: JSONSchemaProperty, newProp: JSONSchemaProperty): number {
  let score = 0;
  let total = 0;

  // Type similarity (weight: 3)
  total += 3;
  if (deepEqual(oldProp.type, newProp.type)) {
    score += 3;
  }

  // Description similarity (weight: 1)
  total += 1;
  if (oldProp.description && newProp.description) {
    const oldDesc = oldProp.description.toLowerCase();
    const newDesc = newProp.description.toLowerCase();
    if (oldDesc === newDesc) {
      score += 1;
    } else if (oldDesc.includes(newDesc) || newDesc.includes(oldDesc)) {
      score += 0.5;
    }
  }

  // Constraint similarity (weight: 1)
  total += 1;
  if (deepEqual(oldProp.enum, newProp.enum)) {
    score += 0.5;
  }
  if (oldProp.pattern === newProp.pattern) {
    score += 0.5;
  }

  return score / total;
}
