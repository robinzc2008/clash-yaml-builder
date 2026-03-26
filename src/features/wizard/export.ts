type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export async function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
) {
  const invoke = window.__TAURI_INTERNALS__?.invoke;

  if (invoke) {
    const result = await invoke<string>("save_text_file", {
      defaultName: filename,
      content,
    });

    if (result === "cancelled") {
      return;
    }

    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
