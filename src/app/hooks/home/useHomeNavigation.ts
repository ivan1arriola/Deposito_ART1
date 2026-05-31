import { useCallback, useEffect, useState } from "react";
import type { MainView } from "@/types/views";

const DEFAULT_HOME_VIEW: MainView = "dashboard";

function getHashView(): MainView {
  if (typeof window === "undefined") return DEFAULT_HOME_VIEW;

  const hash = window.location.hash.replace("#", "").trim();

  if (!hash) return DEFAULT_HOME_VIEW;

  return hash as MainView;
}

export function useHomeNavigation() {
  const [activeView, setActiveViewState] = useState<MainView>(() => getHashView());

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      if (event.state?.view) {
        setActiveViewState(event.state.view as MainView);
        return;
      }

      setActiveViewState(getHashView());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    window.history.replaceState({ view: activeView }, "", `#${activeView}`);
  }, [activeView]);

  const setActiveView = useCallback((view: MainView) => {
    setActiveViewState(view);

    if (typeof window === "undefined") return;

    const currentHash = window.location.hash.replace("#", "");

    if (currentHash !== view) {
      window.history.pushState({ view }, "", `#${view}`);
    }
  }, []);

  return {
    activeView,
    setActiveView,
  };
}
