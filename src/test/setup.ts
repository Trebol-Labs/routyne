// Global test setup — runs before every test file.
// Must be first: patches ALL IDB globals (indexedDB, IDBRequest, IDBKeyRange, IDBCursor, etc.)
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';
import { resetDBSingleton } from '@/lib/db/index';

let storage: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { storage = {}; },
  get length() { return Object.keys(storage).length; },
  key: (i: number) => Object.keys(storage)[i] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);

// Reset storage + IDB between tests so state doesn't leak across test cases.
beforeEach(() => {
  storage = {};
  resetDBSingleton();
  vi.stubGlobal('indexedDB', new IDBFactory());  // fresh IDB per test
});
