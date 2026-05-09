import { Suspense, lazy, memo, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useDesktop } from "../store/desktop";
import { Window } from "./Window";
import { getApp } from "../apps/registry";
import type { AppWindow } from "../store/desktop";

// Cache of lazy components — created once per appId, never recreated
const componentCache = new Map<string, React.LazyExoticComponent<any>>();

function getLazyComponent(appId: string) {
  if (componentCache.has(appId)) return componentCache.get(appId)!;
  const manifest = getApp(appId);
  if (!manifest) return null;
  const comp = lazy(manifest.component);
  componentCache.set(appId, comp);
  return comp;
}

const AppWindow = memo(({ win }: { win: AppWindow }) => {
  const AppComp = useMemo(() => getLazyComponent(win.appId), [win.appId]);
  if (!AppComp) return null;
  return (
    <Window win={win}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-[10px] text-slate-700 tracking-widest uppercase">
              Loading...
            </div>
          </div>
        }
      >
        <AppComp />
      </Suspense>
    </Window>
  );
});

export function WindowManager() {
  const { windows } = useDesktop();
  return (
    <div className="absolute inset-0 min-h-0 min-w-0">
      <AnimatePresence>
        {windows.map((win) => (
          <AppWindow key={win.id} win={win} />
        ))}
      </AnimatePresence>
    </div>
  );
}
