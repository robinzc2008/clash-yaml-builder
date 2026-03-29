type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export interface DetectCfwCoreResult {
  status: "detected" | "unknown" | "not_running";
  kernel: "mihomo" | "classic" | "unknown";
  summary: string;
}

export async function detectCfwCore() {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    throw new Error(
      "Clash (Windows client) core detection currently needs the desktop app so it can inspect the running processes locally.",
    );
  }

  return invoke<DetectCfwCoreResult>("detect_cfw_core");
}
