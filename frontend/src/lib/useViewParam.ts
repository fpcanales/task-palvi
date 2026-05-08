import { useEffect, useState } from "react";

const VALID = new Set(["report", "rules"]);
const DEFAULT_VIEW = "report" as const;

export type View = "report" | "rules";

function readView(): View {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("view");
  return raw && VALID.has(raw) ? (raw as View) : DEFAULT_VIEW;
}

export function useViewParam(): [View, (v: View) => void] {
  const [view, setViewState] = useState<View>(readView);

  useEffect(() => {
    function onPop() {
      setViewState(readView());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setView = (v: View) => {
    const url = new URL(window.location.href);
    if (v === DEFAULT_VIEW) url.searchParams.delete("view");
    else url.searchParams.set("view", v);
    window.history.pushState({}, "", url.toString());
    setViewState(v);
  };

  return [view, setView];
}
