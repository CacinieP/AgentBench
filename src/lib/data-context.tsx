"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { TestSuite, TestRun } from "./types";
import { createSeedSuites, createSeedRuns } from "./seed-data";
import {
  useLocalStorage,
  readFromStorage,
  writeToStorage,
} from "./use-local-storage";

const SUITES_KEY = "agentbench-suites";
const RUNS_KEY = "agentbench-runs";
const INIT_KEY = "agentbench-initialized";

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

function parseArray<T>(raw: string): T[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const seeded = useRef(false);
  const rawSuites = useLocalStorage(SUITES_KEY, "[]");
  const rawRuns = useLocalStorage(RUNS_KEY, "[]");

  // Seed on first mount — no side effects during snapshot
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(INIT_KEY)) return;
    writeToStorage(SUITES_KEY, createSeedSuites());
    writeToStorage(RUNS_KEY, createSeedRuns());
    localStorage.setItem(INIT_KEY, "1");
  }, []);

  const suites = useMemo(() => parseArray<TestSuite>(rawSuites), [rawSuites]);
  const runs = useMemo(() => parseArray<TestRun>(rawRuns), [rawRuns]);

  const addSuite = useCallback((suite: TestSuite) => {
    const current = readFromStorage<TestSuite>(SUITES_KEY);
    writeToStorage(SUITES_KEY, [...current, suite]);
  }, []);

  const updateSuite = useCallback((id: string, patch: Partial<TestSuite>) => {
    const current = readFromStorage<TestSuite>(SUITES_KEY);
    writeToStorage(
      SUITES_KEY,
      current.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

  const deleteSuite = useCallback((id: string) => {
    writeToStorage(
      SUITES_KEY,
      readFromStorage<TestSuite>(SUITES_KEY).filter((s) => s.id !== id)
    );
    writeToStorage(
      RUNS_KEY,
      readFromStorage<TestRun>(RUNS_KEY).filter((r) => r.suiteId !== id)
    );
  }, []);

  const addRun = useCallback((run: TestRun) => {
    const current = readFromStorage<TestRun>(RUNS_KEY);
    writeToStorage(RUNS_KEY, [...current, run]);
  }, []);

  const deleteRun = useCallback((id: string) => {
    writeToStorage(
      RUNS_KEY,
      readFromStorage<TestRun>(RUNS_KEY).filter((r) => r.id !== id)
    );
  }, []);

  const clearAllData = useCallback(() => {
    writeToStorage(SUITES_KEY, []);
    writeToStorage(RUNS_KEY, []);
    localStorage.removeItem(INIT_KEY);
  }, []);

  const resetToSeed = useCallback(() => {
    writeToStorage(SUITES_KEY, createSeedSuites());
    writeToStorage(RUNS_KEY, createSeedRuns());
    localStorage.setItem(INIT_KEY, "1");
  }, []);

  const importData = useCallback(
    (data: { suites?: TestSuite[]; runs?: TestRun[] }) => {
      const existingIds = new Set(
        readFromStorage<TestSuite>(SUITES_KEY).map((s) => s.id)
      );
      const existingRunIds = new Set(
        readFromStorage<TestRun>(RUNS_KEY).map((r) => r.id)
      );

      if (data.suites?.length) {
        const newSuites = data.suites.filter((s) => !existingIds.has(s.id));
        writeToStorage(SUITES_KEY, [
          ...readFromStorage<TestSuite>(SUITES_KEY),
          ...newSuites,
        ]);
      }
      if (data.runs?.length) {
        const newRuns = data.runs.filter((r) => !existingRunIds.has(r.id));
        writeToStorage(RUNS_KEY, [
          ...readFromStorage<TestRun>(RUNS_KEY),
          ...newRuns,
        ]);
      }
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
    [
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
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
