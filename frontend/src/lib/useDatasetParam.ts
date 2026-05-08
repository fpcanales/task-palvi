import { useCallback, useEffect, useState } from "react";

const PARAM = "dataset";

function readFromUrl(valid: Set<string>, fallback: string): string {
  const v = new URLSearchParams(window.location.search).get(PARAM);
  return v && valid.has(v) ? v : fallback;
}

/**
 * Syncs the active dataset id with the `?dataset=` URL search param.
 *
 * - On mount: reads the URL param, falls back to `fallback` if absent or invalid.
 * - When `validIds` becomes available: re-validates current value, self-heals the URL
 *   via pushState if the current value is not in the valid set.
 * - On browser back/forward (popstate): reads the updated URL param.
 * - `set(id)`: updates state and pushes a new history entry — no full reload.
 */
export function useDatasetParam(
  validIds: string[],
  fallback = "A",
): [string, (id: string) => void] {
  const valid = new Set(validIds);
  const [active, setActive] = useState<string>(() => readFromUrl(valid, fallback));

  // Re-validate once the valid id list becomes available (async load race).
  // If the current value is invalid, self-heal the URL and fall back.
  useEffect(() => {
    if (validIds.length === 0) return;
    const corrected = readFromUrl(new Set(validIds), fallback);
    setActive((cur) => {
      if (!new Set(validIds).has(cur)) {
        const url = new URL(window.location.href);
        url.searchParams.set(PARAM, corrected);
        window.history.pushState({}, "", url.toString());
        return corrected;
      }
      return cur;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds.join(",")]);

  // Listen for browser back/forward navigation.
  useEffect(() => {
    const onPop = () => setActive(readFromUrl(new Set(validIds), fallback));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds.join(",")]);

  const set = useCallback(
    (id: string) => {
      if (!new Set(validIds).has(id)) return;
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, id);
      window.history.pushState({}, "", url.toString());
      setActive(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validIds.join(",")],
  );

  return [active, set];
}
