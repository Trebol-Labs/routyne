const LOCAL_DATA_MARKER_KEY = 'routyne-has-local-data';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasLocalDataMarker(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    return storage.getItem(LOCAL_DATA_MARKER_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLocalDataMarker(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(LOCAL_DATA_MARKER_KEY, '1');
  } catch {
    // Ignore storage quota / private browsing failures.
  }
}

export function clearLocalDataMarker(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(LOCAL_DATA_MARKER_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function syncLocalDataMarker(hasLocalData: boolean): void {
  if (hasLocalData) {
    setLocalDataMarker();
  } else {
    clearLocalDataMarker();
  }
}
