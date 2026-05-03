import { useEffect, useState } from "react";
import { useUi } from "../store/ui";

export function Taskbar() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const { lock } = useUi();

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(
        n.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className="h-7 flex-shrink-0 flex items-center justify-between px-4 bg-black/50 border-b border-white/[0.05] z-50 backdrop-blur-sm"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div
        className="text-[9px] font-bold tracking-[4px] uppercase"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <span className="text-cyan-400">AX</span>
        <span className="text-purple-500">IOM</span>
      </div>
      <div
        className="flex items-center gap-4"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <span className="text-[10px] text-slate-600">{date}</span>
        <span className="text-[10px] text-slate-400 font-medium tabular-nums">
          {time}
        </span>
        <button
          onClick={lock}
          className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
          title="Lock"
        >
          🔒
        </button>
        <button
          onClick={() => window.axiom.winClose()}
          className="text-[10px] text-slate-700 hover:text-red-400 transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
