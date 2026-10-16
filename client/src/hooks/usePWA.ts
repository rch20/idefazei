import { useEffect, useState } from "react";

interface PWAState {
  swRegistered: boolean;
  notificationPermission: NotificationPermission;
  requestNotifications: () => Promise<boolean>;
  isInstallable: boolean;
  installPWA: () => void;
}

let deferredPrompt: any = null;

export function usePWA(): PWAState {
  const [swRegistered, setSwRegistered] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwRegistered(true);
          console.log("[PWA] Service Worker registrado:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Falha ao registrar Service Worker:", err);
        });
    }

    // Verificar permissão de notificações
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Capturar evento de instalação
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const requestNotifications = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === "granted";
  };

  const installPWA = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      setIsInstallable(false);
    });
  };

  return {
    swRegistered,
    notificationPermission,
    requestNotifications,
    isInstallable,
    installPWA,
  };
}
