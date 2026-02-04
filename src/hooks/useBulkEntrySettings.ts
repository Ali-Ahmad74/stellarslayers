import { useState, useEffect, useCallback } from "react";

export interface BulkEntrySettings {
  autoScrollEnabled: boolean;
  showOnlySelected: boolean;
  showWarnings: boolean;
  defaultSelectAll: boolean;
  confirmBeforeSave: boolean;
  clearAfterSave: boolean;
}

const STORAGE_KEY = "bulkEntrySettings";

const DEFAULT_SETTINGS: BulkEntrySettings = {
  autoScrollEnabled: true,
  showOnlySelected: false,
  showWarnings: true,
  defaultSelectAll: false,
  confirmBeforeSave: false,
  clearAfterSave: true,
};

function loadSettings(): BulkEntrySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate from old individual keys
      const autoScroll = localStorage.getItem("bulkGridAutoScroll");
      const showSelected = localStorage.getItem("bulkGridShowOnlySelected");
      const showWarnings = localStorage.getItem("bulkGridShowWarnings");
      
      const migrated: BulkEntrySettings = {
        ...DEFAULT_SETTINGS,
        autoScrollEnabled: autoScroll !== null ? autoScroll === "true" : DEFAULT_SETTINGS.autoScrollEnabled,
        showOnlySelected: showSelected !== null ? showSelected === "true" : DEFAULT_SETTINGS.showOnlySelected,
        showWarnings: showWarnings !== null ? showWarnings === "true" : DEFAULT_SETTINGS.showWarnings,
      };
      
      // Save migrated settings
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      
      // Clean up old keys
      localStorage.removeItem("bulkGridAutoScroll");
      localStorage.removeItem("bulkGridShowOnlySelected");
      localStorage.removeItem("bulkGridShowWarnings");
      
      return migrated;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: BulkEntrySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function useBulkEntrySettings() {
  const [settings, setSettingsState] = useState<BulkEntrySettings>(loadSettings);

  const updateSettings = useCallback((updates: Partial<BulkEntrySettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { settings, updateSettings, resetSettings, DEFAULT_SETTINGS };
}
