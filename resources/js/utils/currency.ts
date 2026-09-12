import { useEffect, useState } from "react";
import { coreApi, CurrencyApi } from "../api/core";

const STORAGE_KEY = "mizan_base_currency_symbol";

let cachedCurrency: CurrencyApi | null = null;
let fetchPromise: Promise<CurrencyApi | null> | null = null;

export function getCachedBaseCurrencySymbol(): string {
  if (cachedCurrency) {
    return cachedCurrency.symbol || cachedCurrency.code || "";
  }
  return localStorage.getItem(STORAGE_KEY) || "";
}

export async function fetchBaseCurrency(): Promise<CurrencyApi | null> {
  if (cachedCurrency) return cachedCurrency;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const currencies = await coreApi.getCurrencies();
      const base = currencies.find((c) => c.is_base_currency) || currencies[0] || null;
      if (base) {
        cachedCurrency = base;
        const sym = base.symbol || base.code || "";
        localStorage.setItem(STORAGE_KEY, sym);
      }
      return base;
    } catch {
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useBaseCurrency() {
  const [baseCurrency, setBaseCurrency] = useState<CurrencyApi | null>(cachedCurrency);
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => getCachedBaseCurrencySymbol());
  const [loading, setLoading] = useState<boolean>(!cachedCurrency);

  useEffect(() => {
    fetchBaseCurrency().then((base) => {
      if (base) {
        setBaseCurrency(base);
        setCurrencySymbol(base.symbol || base.code || "");
      }
      setLoading(false);
    });
  }, []);

  return { baseCurrency, currencySymbol, loading };
}
