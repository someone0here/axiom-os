import { useRef, useCallback } from "react";

export function useWindowDrag(
  onMove: (x: number, y: number) => void,
  disabled = false,
) {
  const drag = useRef({ active: false, ox: 0, oy: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent, rect: DOMRect) => {
      if (disabled) return;
      drag.current = {
        active: true,
        ox: e.clientX - rect.left,
        oy: e.clientY - rect.top,
      };
      const move = (ev: MouseEvent) => {
        if (drag.current.active)
          onMove(ev.clientX - drag.current.ox, ev.clientY - drag.current.oy);
      };
      const up = () => {
        drag.current.active = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    },
    [onMove, disabled],
  );

  return { onMouseDown };
}
