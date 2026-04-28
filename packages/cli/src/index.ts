#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { runDiff } from './commands/diff.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
) as { version: string };

const program = new Command();

program.name('mcp-evolution').description('CLI for MCP schema evolution').version(pkg.version);

program
  .command('diff')
  .description('Compare two tool snapshots and report schema changes')
  .argument('<old>', 'Path to the old tool snapshot JSON')
  .argument('<new>', 'Path to the new tool snapshot JSON')
  .option('--json', 'Output results as JSON')
  .action((oldPath: string, newPath: string, options: { json?: boolean }) => {
    const exitCode = runDiff(oldPath, newPath, { json: options.json ?? false });
    process.exit(exitCode);
  });

program.parse();
