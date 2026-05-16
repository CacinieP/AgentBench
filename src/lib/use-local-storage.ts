"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((cb) => cb());
}

export function notifyStorageChange() {
  emitChange();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getServerSnapshot(): string {
  return "";
}

export function useLocalStorage(key: string, fallback: string): string {
  const getSnapshot = () => {
    if (typeof window === "undefined") return fallback;
    return localStorage.getItem(key) ?? fallback;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  return parseArray<T>(raw);
}

export function writeToStorage<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
  emitChange();
}

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
