import { apiRequest } from './api';

/** Avisos no celular (Web Push) para a hora de postar no Kwai. */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getPushState(): Promise<{ supported: boolean; permission: NotificationPermission | 'unsupported'; subscribed: boolean; devices: number }> {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', subscribed: false, devices: 0 };
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    subscribed = Boolean(reg && (await reg.pushManager.getSubscription()));
  } catch {
    subscribed = false;
  }
  let devices = 0;
  try {
    devices = (await apiRequest<{ devices: number }>('/api/push/status')).devices || 0;
  } catch {
    devices = 0;
  }
  return { supported: true, permission: Notification.permission, subscribed, devices };
}

export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Este navegador não recebe avisos. No iPhone, instale o Portal na tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Os avisos foram bloqueados. Libere as notificações do site nas configurações do navegador.');
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const { publicKey } = await apiRequest<{ publicKey: string }>('/api/push/public-key');
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource });
  }
  await apiRequest('/api/push/subscribe', { method: 'POST', body: { subscription: subscription.toJSON() } });
}

export async function sendTestPush(): Promise<{ delivered: number; devices: number; failures: Array<{ service: string; status: number | null; detail: string }> }> {
  const res = await apiRequest<{ delivered: number; devices: number; failures?: Array<{ service: string; status: number | null; detail: string }> }>('/api/push/test', { method: 'POST', body: {} });
  return { delivered: res.delivered || 0, devices: res.devices || 0, failures: res.failures || [] };
}
