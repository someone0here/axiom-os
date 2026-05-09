import { useState } from "react";
import { useDesktop } from "../store/desktop";
import { useUi } from "../store/ui";
import { getAllApps } from "../apps/registry";

export function Dock() {
  const { open, windows } = useDesktop();
  const { lock } = useUi();
  const apps = getAllApps();
  const isOpen = (id: string) =>
    windows.some((w) => w.appId === id && !w.minimized);

  return (
    <div className="z-50 flex flex-shrink-0 justify-center px-2 pb-2 pt-1">
      <div className="no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-2xl border border-white/[0.09] bg-white/[0.06] px-2 py-1.5 backdrop-blur-md sm:gap-1 sm:px-3 sm:py-2">
        {apps.map((app) => (
          <DockIcon
            key={app.id}
            icon={app.icon}
            label={app.label}
            bg={app.iconBg}
            isOpen={isOpen(app.id)}
            onClick={() => open(app.id)}
          />
        ))}
        <div className="mx-0.5 h-7 w-px shrink-0 bg-white/[0.08] sm:mx-1" />
        <DockIcon
          icon="🔒"
          label="Lock"
          bg="rgba(239,68,68,0.15)"
          isOpen={false}
          onClick={lock}
        />
      </div>
    </div>
  );
}

function DockIcon({
  icon,
  label,
  bg,
  isOpen,
  onClick,
}: {
  icon: string;
  label: string;
  bg: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute bottom-full mb-2 px-2 py-1 bg-[#0e0e1a]/95 border border-white/10 rounded-md text-[9px] text-slate-400 whitespace-nowrap pointer-events-none z-10">
          {label}
        </div>
      )}
      <button
        onClick={onClick}
        style={{ background: bg }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-transform duration-150 hover:-translate-y-1 hover:scale-110 sm:h-11 sm:w-11 sm:text-lg"
      >
        {icon}
      </button>
      {isOpen && (
        <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" />
      )}
    </div>
  );
}
