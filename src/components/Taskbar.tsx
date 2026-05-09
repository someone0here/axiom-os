import { useEffect, useState } from "react";
import { useUi } from "../store/ui";
import { useDesktop } from "../store/desktop";
//import { useAuth } from "../store/auth";

export function Taskbar() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { lock, setSpotlight } = useUi();
  const { windows } = useDesktop();
  //const { profileId } = useAuth();

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(
        n.toLocaleDateString([], {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleShutdown = () => {
    setShowPowerMenu(false);
    window.axiom.winClose();
  };

  const handleLock = () => {
    setShowPowerMenu(false);
    lock();
  };

  const handleMinimizeAll = () => {
    setShowPowerMenu(false);
    window.axiom.winMinimize();
  };

  return (
    <>
      {/* Click outside to close menus */}
      {(showPowerMenu || showUserMenu) && (
        <div
          className="fixed inset-0 z-[998]"
          onClick={() => {
            setShowPowerMenu(false);
            setShowUserMenu(false);
          }}
        />
      )}

      <div
        className="relative z-[999] flex min-h-8 flex-shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 sm:px-4"
        style={
          {
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            WebkitAppRegion: "drag",
          } as any
        }
      >
        {/* LEFT — Logo + active apps */}
        <div
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:max-w-none md:flex-none"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-black/60" />
            </div>
            <span className="hidden text-[10px] font-black uppercase tracking-[4px] sm:inline">
              <span className="text-cyan-400">AX</span>
              <span className="text-purple-400">IOM</span>
            </span>
          </div>

          {/* Divider */}
          <div className="hidden h-3 w-px bg-white/10 sm:block" />

          {/* Spotlight trigger */}
          <button
            onClick={() => setSpotlight(true)}
            className="group flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors hover:bg-white/[0.06]"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-600 group-hover:text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="hidden text-[9px] text-slate-700 transition-colors group-hover:text-slate-400 sm:inline">
              Search
            </span>
            <kbd className="hidden text-[7px] text-slate-800 bg-white/5 px-1 rounded border border-white/10 md:inline">
              ⌘Space
            </kbd>
          </button>

          {/* Active window count */}
          {windows.filter((w) => !w.minimized).length > 0 && (
            <>
              <div className="hidden h-3 w-px bg-white/10 md:block" />
              <div className="hidden items-center gap-1 md:flex">
                {windows
                  .filter((w) => !w.minimized)
                  .slice(0, 4)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]"
                    >
                      <div className="w-1 h-1 rounded-full bg-cyan-400/60" />
                      <span className="text-[8px] text-slate-600 max-w-[60px] truncate">
                        {w.title}
                      </span>
                    </div>
                  ))}
                {windows.filter((w) => !w.minimized).length > 4 && (
                  <span className="text-[8px] text-slate-700">
                    +{windows.filter((w) => !w.minimized).length - 4}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — System controls */}
        <div
          className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          {/* Date */}
          <div className="hidden rounded-md px-2 py-0.5 sm:block">
            <span className="text-[9px] text-slate-600">{date}</span>
          </div>

          {/* Clock */}
          <div className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05]">
            <span className="text-[10px] font-semibold text-slate-300 tabular-nums">
              {time}
            </span>
          </div>

          <div className="w-px h-3 bg-white/10 mx-1" />
          {/* Minimize app button */}
          <button
            onClick={() => window.axiom.winMinimize()}
            title="Minimize"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors group"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-600 group-hover:text-slate-300 transition-colors"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Fullscreen toggle button */}
          <button
            onClick={() => {
              window.axiom.winMaximize();
              setIsFullscreen((v) => !v);
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors group"
          >
            {isFullscreen ? (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-green-400 group-hover:text-slate-300 transition-colors"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-600 group-hover:text-green-400 transition-colors"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>

          {/* User / Profile button 
          <button
            onClick={() => {
              setShowUserMenu((v) => !v);
              setShowPowerMenu(false);
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/[0.06] transition-colors group"
          >
            <div className="w-4 h-4 rounded-full bg-purple-500/30 border border-purple-500/40 flex items-center justify-center">
              <span className="text-[7px] text-purple-300 font-bold">
                P{profileId}
              </span>
            </div>
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`text-slate-700 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>*/}

          {/* Lock button */}
          <button
            onClick={lock}
            title="Lock Screen"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors group"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate-600 group-hover:text-yellow-400 transition-colors"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>

          {/* Power button */}
          <button
            onClick={() => {
              setShowPowerMenu((v) => !v);
              setShowUserMenu(false);
            }}
            title="Power"
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors
              ${showPowerMenu ? "bg-red-500/20" : "hover:bg-red-500/10"} group`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-colors ${showPowerMenu ? "text-red-400" : "text-slate-600 group-hover:text-red-400"}`}
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>

        {/* User Menu Dropdown 
        {showUserMenu && (
          <div
            className="absolute top-full right-16 mt-1 w-48 bg-[#0c0c1e]/98 border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-[1000]"
            style={{ backdropFilter: "blur(20px)" }}
          >
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <div className="text-[10px] text-slate-400 font-medium">
                Profile {profileId}
              </div>
              <div className="text-[8px] text-slate-700 mt-0.5">
                AXIOM OS v1.0.0
              </div>
            </div>
            {[
              { icon: "🔒", label: "Lock Screen", action: handleLock },
              {
                icon: "⚙️",
                label: "Settings",
                action: () => {
                  setShowUserMenu(false);
                },
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-[11px] text-slate-400">{item.label}</span>
              </button>
            ))}
          </div>
        )}*/}

        {/* Power Menu Dropdown */}
        {showPowerMenu && (
          <div
            className="absolute top-full right-2 mt-1 w-44 rounded-xl overflow-hidden shadow-2xl z-[1000]"
            style={{
              background: "#0c0c1e",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div className="px-4 py-2 border-b border-white/[0.05]">
              <div className="text-[9px] text-slate-700 uppercase tracking-widest">
                System
              </div>
            </div>
            {[
              {
                icon: (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-yellow-400"
                  >
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                ),
                label: "Lock Screen",
                sub: "Ctrl+Shift+L",
                action: handleLock,
                color: "hover:bg-yellow-500/10",
              },
              {
                icon: (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-400"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                label: "Minimize",
                sub: "Hide window",
                action: handleMinimizeAll,
                color: "hover:bg-blue-500/10",
              },
              {
                icon: (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-red-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ),
                label: "Quit AXIOM",
                sub: "Close app",
                action: handleShutdown,
                color: "hover:bg-red-500/10",
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${item.color}`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <div>
                  <div className="text-[11px] text-slate-300">{item.label}</div>
                  <div className="text-[8px] text-slate-700">{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
