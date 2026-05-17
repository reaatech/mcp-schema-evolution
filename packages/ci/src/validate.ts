import { existsSync, readFileSync } from 'node:fs';
import {
  diffToolSnapshots,
  type EvolutionError,
  loadToolsFromFile,
  type SchemaChange,
} from '@reaatech/mcp-schema-evolution';

export interface ValidationPolicy {
  failOnBreaking?: boolean;
  acknowledgmentFile?: string;
}

export interface ValidationResult {
  ok: boolean;
  changes: SchemaChange[];
  breakingCount: number;
  acknowledged: boolean;
  error?: EvolutionError;
}

function hasAcknowledgment(acknowledgmentFile: string): boolean {
  return existsSync(acknowledgmentFile);
}

interface AcknowledgedChange {
  toolName: string;
  category: string;
  description: string;
}

function parseAcknowledgmentFile(filePath: string): AcknowledgedChange[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries: AcknowledgedChange[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('|');
    if (parts.length >= 2) {
      entries.push({
        toolName: (parts[0] ?? '').trim(),
        category: (parts[1] ?? '').trim(),
        description: parts.slice(2).join('|').trim(),
      });
    }
  }

  return entries;
}

function isBreakingChangeAcknowledged(
  change: SchemaChange,
  acknowledged: AcknowledgedChange[],
): boolean {
  return acknowledged.some(
    (ack) =>
      (ack.toolName === change.toolName || ack.toolName === '*') &&
      (ack.category === change.category || ack.category === '*') &&
      (!ack.description ||
        change.description.toLowerCase().includes(ack.description.toLowerCase()) ||
        ack.description.toLowerCase().includes(change.description.toLowerCase())),
  );
}

/**
 * Validate a head snapshot against a base snapshot according to a policy.
 *
 * @param options - Configuration for validation
 * @returns ValidationResult summarizing changes and policy compliance
 */
export function validateSnapshot(options: {
  baseSnapshot: string;
  headSnapshot: string;
  policy?: ValidationPolicy;
}): ValidationResult {
  const baseResult = loadToolsFromFile(options.baseSnapshot);
  if (!baseResult.ok) {
    return {
      ok: false,
      changes: [],
      breakingCount: 0,
      acknowledged: false,
      error: baseResult.error,
    };
  }

  const headResult = loadToolsFromFile(options.headSnapshot);
  if (!headResult.ok) {
    return {
      ok: false,
      changes: [],
      breakingCount: 0,
      acknowledged: false,
      error: headResult.error,
    };
  }

  const diffResult = diffToolSnapshots(baseResult.value, headResult.value);

  if (!diffResult.ok) {
    return {
      ok: false,
      changes: [],
      breakingCount: 0,
      acknowledged: false,
      error: diffResult.error,
    };
  }

  const changes = diffResult.value;
  const breakingCount = changes.filter((c) => c.type === 'breaking').length;

  let acknowledgedChanges: AcknowledgedChange[] = [];
  let unacknowledgedBreaking = breakingCount;
  let acknowledged = false;

  if (options.policy?.acknowledgmentFile && hasAcknowledgment(options.policy.acknowledgmentFile)) {
    acknowledgedChanges = parseAcknowledgmentFile(options.policy.acknowledgmentFile);
    acknowledged = acknowledgedChanges.length > 0;
    const unacknowledged = changes.filter(
      (c) => c.type === 'breaking' && !isBreakingChangeAcknowledged(c, acknowledgedChanges),
    );
    unacknowledgedBreaking = unacknowledged.length;
  }

  const failOnBreaking = options.policy?.failOnBreaking ?? true;
  const ok = unacknowledgedBreaking === 0 || !failOnBreaking;

  return {
    ok,
    changes,
    breakingCount,
    acknowledged,
  };
}

/**
 * Format a validation result as a markdown report.
 *
 * @param result - The validation result to format
 * @param options - Formatting options
 * @returns A markdown string suitable for PR comments
 */
export function formatReport(
  result: ValidationResult,
  options: { format: 'github-markdown' | 'text' } = { format: 'github-markdown' },
): string {
  if (options.format !== 'github-markdown') {
    // Simple text fallback
    return result.ok
      ? `Schema validation passed (${result.changes.length} changes, ${result.breakingCount} breaking)`
      : `Schema validation failed (${result.breakingCount} breaking changes)`;
  }

  const lines: string[] = [];

  if (result.error) {
    lines.push('## ❌ Schema Validation Error');
    lines.push('');
    lines.push(`**${result.error.message}**`);
    return lines.join('\n');
  }

  if (result.ok) {
    lines.push('## ✅ Schema Validation Passed');
  } else {
    lines.push('## ❌ Schema Validation Failed');
  }

  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total changes | ${result.changes.length} |`);
  lines.push(`| Breaking changes | ${result.breakingCount} |`);
  lines.push(`| Acknowledged | ${result.acknowledged ? 'Yes' : 'No'} |`);
  lines.push('');

  if (result.changes.length > 0) {
    lines.push('### Changes');
    lines.push('');
    for (const change of result.changes) {
      const badge =
        change.type === 'breaking'
          ? '🔴 **BREAKING**'
          : change.type === 'non-breaking'
            ? '🟡 non-breaking'
            : '🔵 patch';
      lines.push(`- **${change.toolName}** \`${change.path}\` — ${badge}`);
      lines.push(`  - ${change.description}`);
      if (change.migration) {
        lines.push(`  - 💡 ${change.migration.suggestion}`);
      }
    }
    lines.push('');
  }

  if (!result.ok && result.breakingCount > 0 && !result.acknowledged) {
    lines.push(
      '> To allow these breaking changes, create an acknowledgment file (e.g., `.schema-breaking-allowed`).',
    );
  }

  return lines.join('\n');
}
