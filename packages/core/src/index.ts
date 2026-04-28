export {
  EvolutionError,
  type Tool,
  type SemVer,
  type ChangeType,
  type ChangeSeverity,
  type ChangeCategory,
  type SchemaChange,
  type DetectedChange,
  type EvolutionErrorOptions,
  type Result,
  type ToolSnapshot,
  type FieldRename,
  type DiffOptions,
  type MigrationGuidance,
} from './types.js';

export { diffToolSnapshots, classifyChange, detectFieldRenames, loadToolsFromFile } from './diff.js';
