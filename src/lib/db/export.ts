import { getDB } from './index';
import type {
  RoutineRecord, SessionRecord, ExerciseRecord,
  HistoryRecord, ProfileRecord, BodyweightRecord,
} from './schema';

const FORMAT_VERSION = 2;

export interface ExportFile {
  formatVersion: number;
  exportedAt: string;
  data: {
    routines: RoutineRecord[];
    sessions: SessionRecord[];
    exercises: ExerciseRecord[];
    history: HistoryRecord[];
    bodyweight: BodyweightRecord[];
    profile: ProfileRecord | null;
  };
}

export async function exportAllData(): Promise<ExportFile> {
  const db = await getDB();
  const [routines, sessions, exercises, historyAll, bodyweight, profileRaw] = await Promise.all([
    db.getAll('routines'),
    db.getAll('sessions'),
    db.getAll('exercises'),
    db.getAll('history'),
    db.getAll('bodyweight'),
    db.get('profile', 'profile'),
  ]);

  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      routines,
      sessions,
      exercises,
      history: historyAll,
      bodyweight,
      profile: profileRaw ?? null,
    },
  };
}

export function downloadExportFile(data: ExportFile): void {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `routyne-backup-${date}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAllData(file: ExportFile): Promise<void> {
  if (file.formatVersion > FORMAT_VERSION) {
    throw new Error(`Unsupported backup format version: ${file.formatVersion}`);
  }

  const db = await getDB();
  const { routines, sessions, exercises, history, bodyweight = [], profile } = file.data;

  const tx = db.transaction(
    ['routines', 'sessions', 'exercises', 'history', 'bodyweight', 'profile'],
    'readwrite'
  );

  for (const r of routines) await tx.objectStore('routines').put(r);
  for (const s of sessions) await tx.objectStore('sessions').put(s);
  for (const e of exercises) await tx.objectStore('exercises').put(e);
  for (const h of history) await tx.objectStore('history').put(h);
  for (const b of bodyweight) await tx.objectStore('bodyweight').put(b);
  if (profile) await tx.objectStore('profile').put(profile);

  await tx.done;
}
