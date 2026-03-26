import { useState, useCallback } from "react";

type GridDensity = "compact" | "visual";

const STORAGE_KEY = "qb_menu_grid_density";

export function useGridDensity(storageKey = STORAGE_KEY) {
  const [density, setDensityState] = useState<GridDensity>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === "compact" ? "compact" : "visual";
    } catch {
      return "visual";
    }
  });

  const setDensity = useCallback((d: GridDensity) => {
    setDensityState(d);
    try {
      localStorage.setItem(storageKey, d);
    } catch {}
  }, [storageKey]);

  return { density, setDensity } as const;
}
