#!/usr/bin/env node
/**
 * import-exercises.mjs
 * Fetches all exercises from ExerciseDB (RapidAPI) and writes:
 *   src/lib/data/exercises.json       — slim index for Fuse.js lookup
 *   src/lib/data/exercises-full.json  — full payload with gifUrl, instructions, etc.
 *
 * Run once (or on demand) with:
 *   npm run import:exercises
 *
 * Requires RAPIDAPI_KEY in environment (set via .env.local or shell).
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env.local if present (Next.js convention; Node doesn't auto-load it)
const envPath = resolve(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
if (!RAPIDAPI_KEY) {
  console.error('❌  RAPIDAPI_KEY not set. Export it or add to .env.local, then re-run.');
  process.exit(1);
}

const BASE = 'https://exercisedb.p.rapidapi.com';
const HEADERS = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
};

// ── ES translation table ──────────────────────────────────────────────────────
const ES_TRANSLATIONS = {
  'bench press': ['press de banca', 'press banca', 'banca'],
  'deadlift': ['peso muerto', 'levantamiento de peso muerto'],
  'squat': ['sentadilla', 'sentadillas', 'cuclillas'],
  'pull-up': ['dominadas', 'jalones'],
  'pull up': ['dominadas', 'jalones'],
  'push-up': ['flexiones', 'lagartijas'],
  'push up': ['flexiones', 'lagartijas'],
  'curl': ['curl de biceps', 'bicep curl', 'rosca'],
  'row': ['remo', 'jalón al pecho'],
  'press': ['press', 'empuje'],
  'lunge': ['zancada', 'estocada', 'zancadas'],
  'plank': ['plancha'],
  'crunch': ['abdominal', 'abdominales'],
  'dip': ['fondos', 'fondo en paralelas'],
  'overhead press': ['press militar', 'press sobre cabeza', 'ohp'],
  'leg press': ['prensa de piernas', 'prensa'],
  'lat pulldown': ['jalón al pecho', 'jalón en polea'],
  'shoulder press': ['press de hombro', 'press hombros'],
  'hip thrust': ['empuje de cadera', 'puente de glúteo'],
  'glute bridge': ['puente de glúteo', 'puente de cadera'],
  'leg curl': ['curl de piernas', 'curl femoral'],
  'leg extension': ['extensión de cuádriceps', 'extensión de piernas'],
  'calf raise': ['elevación de talones', 'pantorrilla'],
  'lateral raise': ['elevación lateral', 'aperturas laterales'],
  'front raise': ['elevación frontal'],
  'face pull': ['jalón hacia la cara'],
  'fly': ['aperturas', 'apertura de pecho'],
  'flye': ['aperturas', 'apertura de pecho'],
  'tricep': ['tríceps', 'extensión de tríceps'],
  'bicep': ['bíceps', 'curl de bíceps'],
  'chest': ['pecho'],
  'back': ['espalda'],
  'shoulder': ['hombro', 'deltoides'],
  'abs': ['abdominales', 'core'],
  'glute': ['glúteo', 'glúteos'],
  'hamstring': ['isquiotibial', 'femoral'],
  'quadricep': ['cuádriceps'],
  'cable': ['cable', 'polea'],
  'barbell': ['barra', 'barra olímpica'],
  'dumbbell': ['mancuerna', 'mancuernas'],
  'machine': ['máquina'],
  'kettlebell': ['pesa rusa', 'kettlebell'],
  'band': ['banda elástica', 'banda de resistencia'],
};

function generateAliases(name) {
  const lower = name.toLowerCase();
  const extra = [];
  for (const [en, es] of Object.entries(ES_TRANSLATIONS)) {
    if (lower.includes(en)) {
      extra.push(...es);
    }
  }
  return [...new Set(extra)];
}

async function fetchPage(limit, offset) {
  const url = `${BASE}/exercises?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  return res.json();
}

async function main() {
  console.log('⏳  Fetching exercises from ExerciseDB…');

  // ExerciseDB currently serves 10 rows per page on this endpoint/key combo.
  // Page through the full catalog in chunks of 10 until the API returns empty.
  const PAGE_SIZE = 10;
  let all = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(PAGE_SIZE, offset);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    console.log(`   fetched ${all.length} so far…`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`✅  ${all.length} exercises fetched`);

  // Build slim index
  const slim = all.map((ex) => ({
    id: ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    aliases: [
      ex.name.toLowerCase(),
      ...generateAliases(ex.name),
    ],
    exercisedb_name: ex.name,
    media_id: ex.id,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    target: ex.target,
  }));

  // Deduplicate by id
  const seen = new Set();
  const deduped = slim.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const slimPath = resolve(ROOT, 'src/lib/data/exercises.json');
  const fullPath = resolve(ROOT, 'src/lib/data/exercises-full.json');

  writeFileSync(slimPath, JSON.stringify(deduped, null, 2));
  writeFileSync(fullPath, JSON.stringify(all, null, 2));

  console.log(`📝  Wrote ${deduped.length} entries → src/lib/data/exercises.json`);
  console.log(`📝  Wrote full payload → src/lib/data/exercises-full.json`);
}

main().catch((err) => {
  console.error('❌  Import failed:', err.message);
  process.exit(1);
});
