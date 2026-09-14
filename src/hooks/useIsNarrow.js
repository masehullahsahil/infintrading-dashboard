import { useSyncExternalStore } from "react";

/** True when the viewport is at or below `breakpoint` px wide. */
export function useIsNarrow(breakpoint = 880) {
  const query = `(max-width: ${breakpoint}px)`;
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
