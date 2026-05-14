"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useSyncExternalStore,
} from "react";
import { AIProviderConfig, ProviderType, PROVIDER_DEFAULTS } from "./ai-provider";
import { AgentEndpoint, EvaluatorConfig } from "./types";

export interface Settings {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseUrl: string;
  agentEndpoint?: AgentEndpoint;
  defaultEvaluator?: EvaluatorConfig;
  runTimeoutMs?: number;
}

const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  apiKey: "",
  model: PROVIDER_DEFAULTS.anthropic.model,
  baseUrl: PROVIDER_DEFAULTS.anthropic.baseUrl,
  agentEndpoint: undefined,
  defaultEvaluator: { type: "contains", threshold: 0.6 },
  runTimeoutMs: 30000,
};

const STORAGE_KEY = "agentbench-settings";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function getServerSnapshot(): string {
  return "";
}

function parseRaw(raw: string): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  isConfigured: boolean;
  toProviderConfig: () => AIProviderConfig | null;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  isConfigured: false,
  toProviderConfig: () => null,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const settings = useMemo(() => parseRaw(raw), [raw]);

  const isConfigured = !!(settings.apiKey && settings.model);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const current = parseRaw(getSnapshot());
    const next = { ...current, ...patch };
    if (patch.provider && patch.provider !== current.provider) {
      const defaults = PROVIDER_DEFAULTS[patch.provider];
      next.model = patch.model ?? defaults.model;
      next.baseUrl = patch.baseUrl ?? defaults.baseUrl;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    emitChange();
  }, []);

  const toProviderConfig = useCallback((): AIProviderConfig | null => {
    if (!settings.apiKey) return null;
    return {
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
    };
  }, [settings]);

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, isConfigured, toProviderConfig }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
