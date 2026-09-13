import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export type WebPushState =
  | "loading"
  | "subscribed"
  | "available"
  | "denied"
  | "disabled"
  | "unsupported"
  | "error";

type BrowserPushSubscription = PushSubscription;

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = Uint8Array.from(Array.from(raw).map((character) => character.charCodeAt(0)));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function arrayBufferToBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function isBrowserPushSupported() {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

function isIosHomeScreenApp() {
  if (typeof window === "undefined") return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isIos && standalone;
}

export function useWebPush(churchId: number | null) {
  const utils = trpc.useUtils();
  const [localSubscription, setLocalSubscription] = useState<BrowserPushSubscription | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configQuery = trpc.notifications.webPushConfig.useQuery(
    { churchId: churchId ?? 0 },
    { enabled: churchId !== null, staleTime: 5 * 60_000 },
  );
  const statusQuery = trpc.notifications.webPushStatus.useQuery(
    { churchId: churchId ?? 0, endpoint: localSubscription?.endpoint ?? null },
    { enabled: churchId !== null && !localLoading, staleTime: 15_000 },
  );
  const subscribeMutation = trpc.notifications.webPushSubscribe.useMutation();
  const unsubscribeMutation = trpc.notifications.webPushUnsubscribe.useMutation();

  const refreshLocalSubscription = useCallback(async () => {
    if (!isBrowserPushSupported()) {
      setLocalSubscription(null);
      setLocalLoading(false);
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setLocalSubscription(subscription);
    } catch (error) {
      console.warn("[WebPush] Não foi possível ler a assinatura local", error);
      setErrorMessage("Não foi possível consultar este dispositivo.");
    } finally {
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    setLocalLoading(true);
    void refreshLocalSubscription();
  }, [refreshLocalSubscription, churchId]);

  const state: WebPushState = useMemo(() => {
    if (!isBrowserPushSupported()) return "unsupported";
    if (configQuery.isLoading || localLoading || statusQuery.isLoading) return "loading";
    if (configQuery.data?.publicKey === null) return "disabled";
    if (Notification.permission === "denied") return "denied";
    if (localSubscription && statusQuery.data?.subscribed) return "subscribed";
    if (configQuery.isError || statusQuery.isError) return "error";
    return "available";
  }, [configQuery.data?.publicKey, configQuery.isError, configQuery.isLoading, localLoading, localSubscription, statusQuery.data?.subscribed, statusQuery.isError, statusQuery.isLoading]);

  const activate = useCallback(async () => {
    if (!churchId || !configQuery.data?.publicKey || !isBrowserPushSupported()) return false;
    setBusy(true);
    setErrorMessage(null);
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        await refreshLocalSubscription();
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToArrayBuffer(configQuery.data.publicKey),
        });
      }
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("A assinatura do navegador está incompleta.");
      }

      await subscribeMutation.mutateAsync({
        churchId,
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
      setLocalSubscription(subscription);
      await utils.notifications.webPushStatus.invalidate({ churchId, endpoint: json.endpoint });
      return true;
    } catch (error) {
      console.error("[WebPush] Falha ao ativar notificações", error);
      setErrorMessage("Não foi possível ativar as notificações neste dispositivo.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [churchId, configQuery.data?.publicKey, refreshLocalSubscription, subscribeMutation, utils.notifications.webPushStatus]);

  const deactivate = useCallback(async () => {
    if (!churchId || !localSubscription?.endpoint) return false;
    setBusy(true);
    setErrorMessage(null);
    try {
      await unsubscribeMutation.mutateAsync({ churchId, endpoint: localSubscription.endpoint });
      await localSubscription.unsubscribe();
      setLocalSubscription(null);
      await utils.notifications.webPushStatus.invalidate({ churchId, endpoint: localSubscription.endpoint });
      return true;
    } catch (error) {
      console.error("[WebPush] Falha ao desativar notificações", error);
      setErrorMessage("Não foi possível desativar as notificações neste dispositivo.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [churchId, localSubscription, unsubscribeMutation, utils.notifications.webPushStatus]);

  return {
    state,
    busy,
    errorMessage,
    isIosHomeScreenApp: isIosHomeScreenApp(),
    activate,
    deactivate,
  };
}
