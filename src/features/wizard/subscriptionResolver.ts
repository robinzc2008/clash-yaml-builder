import type { ProxyNodeSpec } from "../../core/model/types";

type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export interface ResolvedSubscriptionProxies {
  proxies: ProxyNodeSpec[];
  warnings: string[];
}

export async function resolveSubscriptionsInDesktop(
  subscriptions: Array<{ name: string; url: string }>,
) {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    throw new Error(
      "Desktop subscription resolution currently needs the desktop app so it can resolve the subscription locally.",
    );
  }

  return invoke<ResolvedSubscriptionProxies>("resolve_subscriptions_in_desktop", {
    subscriptions,
  });
}
