import { useEffect, useState } from "react";

// Force un nouvel affichage à intervalle régulier (pour les « il y a X min » et les délais)
export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
