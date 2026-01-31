import { useEffect, useRef } from "react";

type SwipeBackOptions = {
  onSwipeBack: () => void;
  threshold?: number; // minimum swipe distance in pixels
  edgeWidth?: number; // how many pixels from the left edge to start detecting
  enabled?: boolean;
};

/**
 * Hook to detect swipe-from-left-edge gesture for back navigation.
 * Mimics iOS swipe-to-go-back behavior.
 */
export function useSwipeBack({
  onSwipeBack,
  threshold = 100,
  edgeWidth = 30,
  enabled = true,
}: SwipeBackOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const startedFromEdge = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      // Only start tracking if touch begins near the left edge
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        startedFromEdge.current = true;
      } else {
        startedFromEdge.current = false;
      }
    };

    const handleTouchMove = (_e: TouchEvent) => {
      // Intentionally empty - we handle everything in touchend
      // This prevents janky animations during swipe
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (
        !startedFromEdge.current ||
        touchStartX.current === null ||
        touchStartY.current === null
      ) {
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Check if it's a horizontal swipe (not too much vertical movement)
      // and the swipe distance exceeds the threshold
      if (deltaX > threshold && deltaY < deltaX * 0.5) {
        onSwipeBack();
      }

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;
      startedFromEdge.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeBack, threshold, edgeWidth, enabled]);
}
