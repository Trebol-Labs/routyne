#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const forbiddenPatterns = [
];

const log = execFileSync('git', ['log', '--format=%H%x00%B%x00---END---', 'HEAD'], {
  encoding: 'utf8',
});

let currentCommit = '';
const violations = [];

for (const block of log.split('\0---END---\n')) {
  if (!block.trim()) continue;

  const [hash, message = ''] = block.split('\0');
  currentCommit = hash.trim();

  for (const line of message.split('\n')) {
    if (forbiddenPatterns.some((pattern) => pattern.test(line))) {
      violations.push(`${currentCommit.slice(0, 12)}: ${line.trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Forbidden Claude/ruv commit-message trailers or references found:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

