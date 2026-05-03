// src/components/Window.tsx
import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useDesktop } from "../store/desktop";

export function Window({ win, children }) {
  const { focus, close, minimize, maximize, move } = useDesktop();
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

  const onTitlebarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".win-control")) return;
      if (win.maximized) return;
      const el = e.currentTarget.closest(".window-frame") as HTMLElement;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        dragging: true,
        ox: e.clientX - rect.left,
        oy: e.clientY - rect.top,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current.dragging) return;
        move(
          win.id,
          ev.clientX - dragRef.current.ox,
          ev.clientY - dragRef.current.oy,
        );
      };
      const onUp = () => {
        dragRef.current.dragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [win, move],
  );

  return (
    <motion.div
      className="window-frame absolute flex flex-col rounded-2xl overflow-hidden border border-white/[0.08] bg-[rgba(9,9,20,0.94)]"
      style={{
        left: win.maximized ? 0 : win.x,
        top: win.maximized ? 0 : win.y,
        width: win.maximized ? "100%" : win.width,
        height: win.maximized ? "100%" : win.height,
        zIndex: win.zIndex,
        display: win.minimized ? "none" : "flex",
        boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
      }}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93 }}
      onMouseDown={() => focus(win.id)}
    >
      {/* Titlebar */}
      <div
        className="h-9 flex items-center px-3 gap-3 bg-white/[0.02] border-b border-white/[0.05] cursor-grab active:cursor-grabbing flex-shrink-0"
        onMouseDown={onTitlebarMouseDown}
      >
        <div className="flex gap-[6px] win-control">
          <button
            onClick={() => close(win.id)}
            className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-125"
          />
          <button
            onClick={() => minimize(win.id)}
            className="w-3 h-3 rounded-full bg-[#ffbd2d] hover:brightness-125"
          />
          <button
            onClick={() => maximize(win.id)}
            className="w-3 h-3 rounded-full bg-[#29c940] hover:brightness-125"
          />
        </div>
        <span className="flex-1 text-center text-[10px] text-white/30 font-medium">
          {win.title}
        </span>
        <div className="w-14" />
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </motion.div>
  );
}
