#!/usr/bin/env node
/**
 * Run once to generate VAPID key pair for Web Push.
 * Add the output to your .env.local and Vercel dashboard.
 *
 *   node scripts/generate-vapid-keys.mjs
 */

import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\nVAPID keys generated. Add these to your environment:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com`);
console.log('\nAlso add NEXT_PUBLIC_VAPID_PUBLIC_KEY to the browser bundle.\n');
