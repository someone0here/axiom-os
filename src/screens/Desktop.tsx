import { useEffect } from "react";
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
