type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export async function publishLocalSubscriptionService(
  target: string,
  sourceProjectJson: string,
  configYaml: string,
) {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    throw new Error(
      "Publishing a local subscription URL currently needs the desktop app so it can keep the local subscription service running.",
    );
  }

  return invoke<string>("publish_local_subscription_service", {
    target,
    sourceProjectJson,
    configYaml,
  });
}
