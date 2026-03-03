// Global test setup — runs before every test file.
import 'fake-indexeddb/auto';  // patches globalThis.indexedDB for all tests
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

// Reset storage between tests so state doesn't leak across test cases.
beforeEach(() => {
  storage = {};
  resetDBSingleton();  // force fresh IDB connection each test
});
