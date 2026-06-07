import { useEffect, useState } from 'react';
import { getStoredSettings } from './settings';

export const readTaxSettings = () => {
  const stored = getStoredSettings();
  const vatPercent = Number(stored.vatPercent ?? 19);
  const applyVat = stored.applyVat !== false;
  const pricesIncludeVat = stored.pricesIncludeVat !== false;
  return { vatPercent, applyVat, pricesIncludeVat };
};

export const buildTotals = (sum, taxSettings) => {
  const base = Math.round(Number(sum || 0));
  const vatRate = taxSettings.applyVat ? taxSettings.vatPercent / 100 : 0;

  if (!vatRate) {
    return { subtotal: base, tax: 0, total: base };
  }

  if (taxSettings.pricesIncludeVat) {
    const subtotal = Math.round(base / (1 + vatRate));
    let tax = Math.round(subtotal * vatRate);
    const correction = base - (subtotal + tax);
    if (correction !== 0) tax += correction;
    return { subtotal, tax, total: base };
  }

  const subtotal = base;
  const tax = Math.round(subtotal * vatRate);
  return { subtotal, tax, total: subtotal + tax };
};

export function useTaxSettings() {
  const [taxSettings, setTaxSettings] = useState(readTaxSettings);

  useEffect(() => {
    const handleSettings = () => setTaxSettings(readTaxSettings());
    const handleStorage = (event) => {
      if (event.key === 'app_settings') handleSettings();
    };

    window.addEventListener('app-settings-updated', handleSettings);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('app-settings-updated', handleSettings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return taxSettings;
};
