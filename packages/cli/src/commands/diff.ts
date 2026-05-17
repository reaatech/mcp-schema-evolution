import {
  diffToolSnapshots,
  loadToolsFromFile,
  type SchemaChange,
} from '@reaatech/mcp-schema-evolution';

function formatChange(change: SchemaChange): string {
  const icon = change.type === 'breaking' ? '🔴' : change.type === 'non-breaking' ? '🟡' : '🔵';
  const severity = change.severity.toUpperCase();
  let line = `${icon} [${severity}] ${change.category}: ${change.description}`;
  if (change.migration) {
    line += `\n   → ${change.migration.suggestion}`;
  }
  return line;
}

function reportError(message: string, suggestion?: string, useJson?: boolean): void {
  if (useJson) {
    console.log(JSON.stringify({ ok: false, error: message }));
  } else {
    console.error(`Error: ${message}`);
    if (suggestion) {
      console.error(`Suggestion: ${suggestion}`);
    }
  }
}

export interface DiffRunOptions {
  json?: boolean;
}

export function runDiff(oldPath: string, newPath: string, options?: DiffRunOptions): number {
  const useJson = options?.json ?? false;

  const oldResult = loadToolsFromFile(oldPath);
  if (!oldResult.ok) {
    reportError(oldResult.error.message, oldResult.error.suggestion, useJson);
    return 1;
  }

  const newResult = loadToolsFromFile(newPath);
  if (!newResult.ok) {
    reportError(newResult.error.message, newResult.error.suggestion, useJson);
    return 1;
  }

  const result = diffToolSnapshots(oldResult.value, newResult.value);

  if (!result.ok) {
    if (useJson) {
      console.log(JSON.stringify({ ok: false, error: result.error.message }));
    } else {
      console.error(`Error: ${result.error.message}`);
      if (result.error.suggestion) {
        console.error(`Suggestion: ${result.error.suggestion}`);
      }
    }
    return 1;
  }

  const changes = result.value;

  if (useJson) {
    console.log(JSON.stringify({ ok: true, changes }, null, 2));
    return changes.some((c) => c.type === 'breaking') ? 1 : 0;
  }

  if (changes.length === 0) {
    console.log('✅ No schema changes detected.');
    return 0;
  }

  const breaking = changes.filter((c) => c.type === 'breaking');
  const nonBreaking = changes.filter((c) => c.type !== 'breaking');

  console.log(`\nDetected ${changes.length} change(s):\n`);

  for (const change of breaking) {
    console.log(formatChange(change));
  }

  for (const change of nonBreaking) {
    console.log(formatChange(change));
  }

  console.log();

  if (breaking.length > 0) {
    console.log(`⚠️  ${breaking.length} breaking change(s) found.`);
    return 1;
  }

  console.log('✅ All changes are non-breaking.');
  return 0;
}
