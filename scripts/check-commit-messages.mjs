#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function text(codes) {
  return String.fromCharCode(...codes);
}

const blockedFragments = [
  text([99, 108, 97, 117, 100, 101, 45, 102, 108, 111, 119]),
  text([99, 108, 97, 117, 100, 101, 32, 102, 108, 111, 119]),
  text([114, 117, 118, 110, 101, 116]),
  text([114, 117, 118, 64, 114, 117, 118, 46, 110, 101, 116]),
  text([114, 117, 118, 45, 115, 119, 97, 114, 109]),
];

const blockedPrefix = text([99, 111, 45, 97, 117, 116, 104, 111, 114, 101, 100, 45, 98, 121, 58]);

const messageFileIndex = process.argv.indexOf('--message-file');
const messageFile = messageFileIndex === -1 ? null : process.argv[messageFileIndex + 1];

const log = messageFile
  ? `pending\0${readFileSync(messageFile, 'utf8')}\0---END---\n`
  : execFileSync('git', ['log', '--format=%H%x00%B%x00---END---', 'HEAD'], {
      encoding: 'utf8',
    });

let currentCommit = '';
const violations = [];

for (const block of log.split('\0---END---\n')) {
  if (!block.trim()) continue;

  const [hash, message = ''] = block.split('\0');
  currentCommit = hash.trim();

  for (const line of message.split('\n')) {
    const normalizedLine = line.toLowerCase();

    if (
      normalizedLine.trimStart().startsWith(blockedPrefix) ||
      blockedFragments.some((fragment) => normalizedLine.includes(fragment))
    ) {
      violations.push(`${currentCommit.slice(0, 12)}: ${line.trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Forbidden commit-message text found:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}
