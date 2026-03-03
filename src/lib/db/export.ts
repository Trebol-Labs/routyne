import { getDB } from './index';
import type {
  RoutineRecord, SessionRecord, ExerciseRecord,
  HistoryRecord, ProfileRecord,
} from './schema';

const FORMAT_VERSION = 1;

export interface ExportFile {
  formatVersion: number;
  exportedAt: string;
  data: {
    routines: RoutineRecord[];
    sessions: SessionRecord[];
    exercises: ExerciseRecord[];
    history: HistoryRecord[];
    profile: ProfileRecord | null;
  };
}

export async function exportAllData(): Promise<ExportFile> {
  const db = await getDB();
  const [routines, sessions, exercises, historyAll, profileRaw] = await Promise.all([
    db.getAll('routines'),
    db.getAll('sessions'),
    db.getAll('exercises'),
    db.getAll('history'),
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
  const { routines, sessions, exercises, history, profile } = file.data;

  const tx = db.transaction(
    ['routines', 'sessions', 'exercises', 'history', 'profile'],
    'readwrite'
  );

  for (const r of routines) await tx.objectStore('routines').put(r);
  for (const s of sessions) await tx.objectStore('sessions').put(s);
  for (const e of exercises) await tx.objectStore('exercises').put(e);
  for (const h of history) await tx.objectStore('history').put(h);
  if (profile) await tx.objectStore('profile').put(profile);

  await tx.done;
}
