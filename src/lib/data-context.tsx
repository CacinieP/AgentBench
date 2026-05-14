"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useSyncExternalStore,
} from "react";
import { TestSuite, TestRun } from "./types";
import { createSeedSuites, createSeedRuns } from "./seed-data";

const SUITES_KEY = "agentbench-suites";
const RUNS_KEY = "agentbench-runs";
const INIT_KEY = "agentbench-initialized";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(INIT_KEY)) return;
  localStorage.setItem(SUITES_KEY, JSON.stringify(createSeedSuites()));
  localStorage.setItem(RUNS_KEY, JSON.stringify(createSeedRuns()));
  localStorage.setItem(INIT_KEY, "1");
}

function getSuitesSnapshot(): string {
  ensureSeeded();
  return localStorage.getItem(SUITES_KEY) || "[]";
}

function getRunsSnapshot(): string {
  ensureSeeded();
  return localStorage.getItem(RUNS_KEY) || "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function parseArray<T>(raw: string): T[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function readSuites(): TestSuite[] {
  return parseArray<TestSuite>(localStorage.getItem(SUITES_KEY) || "[]");
}

function readRuns(): TestRun[] {
  return parseArray<TestRun>(localStorage.getItem(RUNS_KEY) || "[]");
}

function writeSuites(suites: TestSuite[]): void {
  localStorage.setItem(SUITES_KEY, JSON.stringify(suites));
}

function writeRuns(runs: TestRun[]): void {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

interface DataContextType {
  suites: TestSuite[];
  runs: TestRun[];
  addSuite: (suite: TestSuite) => void;
  updateSuite: (id: string, patch: Partial<TestSuite>) => void;
  deleteSuite: (id: string) => void;
  addRun: (run: TestRun) => void;
  deleteRun: (id: string) => void;
  clearAllData: () => void;
  resetToSeed: () => void;
  importData: (data: { suites?: TestSuite[]; runs?: TestRun[] }) => void;
}

const DataContext = createContext<DataContextType>({
  suites: [],
  runs: [],
  addSuite: () => {},
  updateSuite: () => {},
  deleteSuite: () => {},
  addRun: () => {},
  deleteRun: () => {},
  clearAllData: () => {},
  resetToSeed: () => {},
  importData: () => {},
});

export function DataProvider({ children }: { children: ReactNode }) {
  const rawSuites = useSyncExternalStore(
    subscribe,
    getSuitesSnapshot,
    getServerSnapshot
  );
  const rawRuns = useSyncExternalStore(
    subscribe,
    getRunsSnapshot,
    getServerSnapshot
  );

  const suites = useMemo(() => parseArray<TestSuite>(rawSuites), [rawSuites]);
  const runs = useMemo(() => parseArray<TestRun>(rawRuns), [rawRuns]);

  const addSuite = useCallback((suite: TestSuite) => {
    const current = readSuites();
    writeSuites([...current, suite]);
    emitChange();
  }, []);

  const updateSuite = useCallback((id: string, patch: Partial<TestSuite>) => {
    const current = readSuites();
    writeSuites(current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    emitChange();
  }, []);

  const deleteSuite = useCallback((id: string) => {
    writeSuites(readSuites().filter((s) => s.id !== id));
    writeRuns(readRuns().filter((r) => r.suiteId !== id));
    emitChange();
  }, []);

  const addRun = useCallback((run: TestRun) => {
    const current = readRuns();
    writeRuns([...current, run]);
    emitChange();
  }, []);

  const deleteRun = useCallback((id: string) => {
    writeRuns(readRuns().filter((r) => r.id !== id));
    emitChange();
  }, []);

  const clearAllData = useCallback(() => {
    writeSuites([]);
    writeRuns([]);
    localStorage.removeItem(INIT_KEY);
    emitChange();
  }, []);

  const resetToSeed = useCallback(() => {
    writeSuites(createSeedSuites());
    writeRuns(createSeedRuns());
    localStorage.setItem(INIT_KEY, "1");
    emitChange();
  }, []);

  const importData = useCallback(
    (data: { suites?: TestSuite[]; runs?: TestRun[] }) => {
      const existingIds = new Set(readSuites().map((s) => s.id));
      const existingRunIds = new Set(readRuns().map((r) => r.id));

      if (data.suites?.length) {
        const newSuites = data.suites.filter((s) => !existingIds.has(s.id));
        writeSuites([...readSuites(), ...newSuites]);
      }
      if (data.runs?.length) {
        const newRuns = data.runs.filter((r) => !existingRunIds.has(r.id));
        writeRuns([...readRuns(), ...newRuns]);
      }
      emitChange();
    },
    []
  );

  const value = useMemo(
    () => ({
      suites,
      runs,
      addSuite,
      updateSuite,
      deleteSuite,
      addRun,
      deleteRun,
      clearAllData,
      resetToSeed,
      importData,
    }),
    [suites, runs, addSuite, updateSuite, deleteSuite, addRun, deleteRun, clearAllData, resetToSeed, importData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
