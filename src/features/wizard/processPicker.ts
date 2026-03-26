type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export async function listRunningProcesses(): Promise<string[]> {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    return [];
  }

  return invoke<string[]>("list_running_processes");
}
