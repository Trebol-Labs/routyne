#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ANDROID_DIR = resolve(ROOT, 'android');
const APK_PATH = resolve(ANDROID_DIR, 'app/build/outputs/apk/debug/app-debug.apk');

const JDK_CANDIDATES = [
  process.env.ANDROID_JAVA_HOME,
  process.env.JAVA_HOME,
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  '/Applications/Android Studio Preview.app/Contents/jbr/Contents/Home',
  '/Applications/Android Studio Canary.app/Contents/jbr/Contents/Home',
].filter(Boolean);

function findJdkHome() {
  for (const candidate of JDK_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function run(command, args, options, cwd = ROOT) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: options,
  });
}

const jdkHome = findJdkHome();
const buildEnv = { ...process.env };

if (jdkHome) {
  buildEnv.JAVA_HOME = jdkHome;
  buildEnv.PATH = `${resolve(jdkHome, 'bin')}:${buildEnv.PATH ?? ''}`;
}

console.log('Building the Android debug APK...');
run('./gradlew', ['assembleDebug'], buildEnv, ANDROID_DIR);

if (!existsSync(APK_PATH)) {
  throw new Error(`Debug APK was not created at ${APK_PATH}`);
}

console.log('Installing the debug APK on the connected Android device...');
run('adb', ['install', '-r', APK_PATH], buildEnv);

console.log('Reopen the app after the hosted Vercel deploy finishes. No reinstall is needed for web-only changes.');
