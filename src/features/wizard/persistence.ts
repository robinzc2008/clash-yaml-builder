import type { WizardState } from "./types";

const STORAGE_KEY = "clash-yaml-builder:wizard-draft";

interface StoredWizardDraft {
  version: 1;
  wizard: WizardState;
  step: number;
  savedAt: string;
}

export function loadWizardDraft(): StoredWizardDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredWizardDraft;
    if (parsed.version !== 1) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveWizardDraft(wizard: WizardState, step: number) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredWizardDraft = {
    version: 1,
    wizard,
    step,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearWizardDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
