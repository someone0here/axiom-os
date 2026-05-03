import { useUi } from "../store/ui";
import { Taskbar } from "../components/Taskbar";
import { Dock } from "../components/Dock";
import { WindowManager } from "../components/WindowManager";
import { LockOverlay } from "../components/LockOverlay";
import { Spotlight } from "../components/Spotlight";
import { useInactivityLock } from "../hooks/useInactivityLock";

export function Desktop() {
  const { wallpaperIndex, wallpapers, isLocked } = useUi();
  useInactivityLock(5 * 60 * 1000);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: wallpapers[wallpaperIndex] }}
    >
      {/* AXIOM watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="flex flex-col items-center gap-2 opacity-[0.05]">
          <div
            style={{
              fontSize: "160px",
              fontWeight: 900,
              letterSpacing: "40px",
              background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            AXIOM
          </div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "10px",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            Private Desktop Environment
          </div>
        </div>
      </div>

      {/* Corner badge */}
      <div className="absolute bottom-16 right-5 pointer-events-none select-none z-0 opacity-[0.08]">
        <div
          style={{
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "5px",
            background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AXIOM OS
        </div>
      </div>

      <Taskbar />
      <div className="flex-1 relative overflow-hidden">
        <WindowManager />
      </div>
      <Dock />
      {isLocked && <LockOverlay />}
      <Spotlight />
    </div>
  );
}
