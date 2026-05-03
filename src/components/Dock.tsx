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
    <div className="flex justify-center pb-2 pt-1 flex-shrink-0 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-white/[0.06] border border-white/[0.09] rounded-2xl backdrop-blur-md">
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
        <div className="w-px h-7 bg-white/[0.08] mx-1" />
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
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg hover:-translate-y-1.5 hover:scale-110 transition-transform duration-150"
      >
        {icon}
      </button>
      {isOpen && (
        <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" />
      )}
    </div>
  );
}
