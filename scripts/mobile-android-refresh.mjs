#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function run(command, args) {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

run('git', ['pull', '--ff-only']);

console.log('');
console.log('Wait for the Vercel deploy to finish, then force-close and reopen the installed Android app.');
console.log('If you changed native shell files, run `pnpm mobile:android:install` after syncing the shell.');
