import { Capacitor } from '@capacitor/core';
import type { DeviceType } from '@proed/shared/core';

export const APP_VERSION: string = __APP_VERSION__;

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

export function deviceType(): DeviceType {
  if (isNative()) return 'android-apk';
  if (isIOS()) return 'iphone-pwa';
  return 'web';
}

/** Base URL of the ProEd server. Same origin for the PWA, absolute for the APK. */
export function serverUrl(path: string): string {
  const base = (import.meta.env.VITE_SERVER_URL ?? '').replace(/\/$/, '');
  return base + path;
}
