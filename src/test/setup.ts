// Global test setup — runs before every test file.
// Provides a working localStorage for tests that use Zustand persist middleware.
import { vi } from 'vitest';

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
});
