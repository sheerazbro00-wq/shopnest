import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrency } from "../api/currency";
import { COUNTRIES, countryOf, formatMoney, validRates } from "../utils/currency";

// The shopper's country and today's rates (spec 007 plan §4.2).
// Both live only in this browser (R-5). Storage can be blocked (private mode, previews):
// every access is guarded and the choice still works for the visit from memory.

const COUNTRY_KEY = "shopnest_country";
const RATES_KEY = "shopnest_rates";
const memory = {};

function read(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* blocked */
  }
  return memory[key] ?? null;
}

function write(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* kept in memory for this visit */
  }
}

const readCountry = () => {
  const code = read(COUNTRY_KEY);
  return COUNTRIES.some((c) => c.code === code) ? code : null;
};

function readCache() {
  try {
    const saved = JSON.parse(read(RATES_KEY));
    return { rates: validRates(saved?.rates), credit: saved?.credit || null };
  } catch {
    return { rates: null, credit: null };
  }
}

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [country, setCountryState] = useState(readCountry); // null until the shopper chooses
  // Last rates from this browser: a returning shopper sees $ at once, no rupee flash.
  const [cache] = useState(readCache);
  const [rates, setRates] = useState(cache.rates);
  const [credit, setCredit] = useState(cache.credit);

  useEffect(() => {
    let alive = true;
    fetchCurrency()
      .then((data) => {
        if (!alive) return;
        const fresh = validRates(data.rates);
        setRates(fresh);
        setCredit(data.credit || null);
        write(RATES_KEY, JSON.stringify({ rates: fresh, credit: data.credit || null }));
      })
      .catch(() => {
        /* offline or API down: keep the cached rates, or rupees */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Another tab changed the country: follow it.
  useEffect(() => {
    const onStorage = (e) => e.key === COUNTRY_KEY && setCountryState(readCountry());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCountry = useCallback((code) => {
    const next = countryOf(code).code;
    write(COUNTRY_KEY, next);
    setCountryState(next);
  }, []);

  const value = useMemo(() => {
    const available = Boolean(rates); // no rate ever → rupees only, no popup or switcher (AC-5.3)
    const current = available ? countryOf(country) : COUNTRIES[0];
    return {
      country: current,
      currency: current.currency,
      rates,
      credit,
      available,
      chosen: country !== null,
      setCountry,
      money: (pkr, style) => formatMoney(pkr, current.currency, rates, style),
    };
  }, [country, rates, credit, setCountry]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);
export const useMoney = () => useContext(CurrencyContext).money;
