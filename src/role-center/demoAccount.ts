import { useSyncExternalStore } from 'react';

export const DEMO_ACCOUNTS = [
  { id: 'zhangsan', name: '陈智超', description: '已有分身' },
  { id: 'demo-new-user', name: '林晓', description: '新用户' },
] as const;
const KEY = 'comac-personal-demo-account';
export let CURRENT_USER = 'zhangsan';
try { if (localStorage.getItem(KEY) === 'demo-new-user') CURRENT_USER = 'demo-new-user'; } catch { /* Session-only selection. */ }
const listeners = new Set<() => void>();
export const isNewDemoUser = () => CURRENT_USER === 'demo-new-user';
export const personalStorageKey = (key: string) => isNewDemoUser() ? `${key}:${CURRENT_USER}` : key;
export function switchDemoAccount(id: string) {
  if (!DEMO_ACCOUNTS.some(account => account.id === id) || id === CURRENT_USER) return;
  CURRENT_USER = id;
  try { localStorage.setItem(KEY, id); } catch { /* Keep session usable. */ }
  listeners.forEach(listener => listener());
}
export function useDemoAccount() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => CURRENT_USER);
}
