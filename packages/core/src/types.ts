/**
 * Minimal MCP Tool type based on the Model Context Protocol specification.
 *
 * We define this locally rather than importing from `@modelcontextprotocol/sdk`
 * to avoid coupling to a specific SDK version's type exports and to guarantee
 * strict compatibility with our diffing engine.
 */
export interface Tool {
  /** The name of the tool. */
  name: string;
  /** A human-readable description of the tool. */
  description?: string;
  /** A JSON Schema object defining the expected parameters for the tool. */
  inputSchema: {
    $schema?: string;
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export type SemVer = `${number}.${number}.${number}`;

export type ChangeType = 'breaking' | 'non-breaking' | 'patch';
export type ChangeSeverity = 'high' | 'medium' | 'low';

export type ChangeCategory =
  | 'tool_added'
  | 'tool_removed'
  | 'field_added'
  | 'field_removed'
  | 'field_renamed'
  | 'type_changed'
  | 'required_changed'
  | 'default_changed'
  | 'constraint_changed'
  | 'deprecated';

export interface MigrationGuidance {
  suggestion: string;
  codeExample?: string;
  automated: boolean;
}

export interface SchemaChange {
  type: ChangeType;
  category: ChangeCategory;
  toolName: string;
  path: string;
  description: string;
  severity: ChangeSeverity;
  migration?: MigrationGuidance;
}

export interface DetectedChange {
  category: ChangeCategory;
  toolName: string;
  path: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  /** Whether the added field is required (only relevant for field_added). */
  required?: boolean;
  /** The constraint field name (only relevant for constraint_changed). */
  constraintName?: string;
}

export interface EvolutionErrorOptions {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export class EvolutionError extends Error {
  readonly code: string;
  readonly path: string | undefined;
  readonly suggestion: string | undefined;

  constructor(options: EvolutionErrorOptions) {
    super(options.message);
    this.name = 'EvolutionError';
    this.code = options.code;
    this.path = options.path;
    this.suggestion = options.suggestion;
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: EvolutionError };

export type ToolSnapshot = Tool[];

export interface FieldRename {
  from: string;
  to: string;
  confidence: number;
}

export interface DiffOptions {
  renameThreshold?: number;
}
