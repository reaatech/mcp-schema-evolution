#!/usr/bin/env node
import { validateSnapshot, formatReport } from './validate.js';
import { fileURLToPath } from 'node:url';

interface ParsedArgs {
  base: string | undefined;
  head: string | undefined;
  format: 'github-markdown' | 'text';
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { base: undefined, head: undefined, format: 'text', help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--base':
        result.base = argv[++i];
        break;
      case '--head':
        result.head = argv[++i];
        break;
      case '--format':
        result.format = argv[++i] === 'github-markdown' ? 'github-markdown' : 'text';
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`Usage: mcp-evolution-ci --base <path> --head <path> [options]

Options:
  --base <path>       Path to the base (old) tool snapshot JSON
  --head <path>       Path to the head (new) tool snapshot JSON
  --format <format>   Output format: text (default) or github-markdown
  --help, -h          Show this help message

Example:
  mcp-evolution-ci --base tools.v1.json --head tools.v2.json --format github-markdown
`);
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.base || !args.head) {
    console.error('Error: --base and --head are required.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  const result = validateSnapshot({ baseSnapshot: args.base, headSnapshot: args.head });
  const report = formatReport(result, { format: args.format });

  console.log(report);
  process.exit(result.ok ? 0 : 1);
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] === modulePath) {
  main();
}
