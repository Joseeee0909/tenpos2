const STORAGE_KEY = 'app_settings';

export const DEFAULT_SETTINGS = {
  vatPercent: 19,
  applyVat: true,
  pricesIncludeVat: true,
  lowStockAlerts: true,
  lowStockThreshold: 5,
  tipSuggested: false,
  tipPercent: 10,
  payCash: true,
  payCard: true,
  payTransfer: true,
  payQr: true,
  menuOrder: ['inicio','productos','pedidos','ventas','mesas','roles','usuarios','config']
};

export const getStoredSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveStoredSettings = (settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  try {
    window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: settings }));
  } catch {
    // no-op
  }
};
