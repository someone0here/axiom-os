import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUi } from "../store/ui";
import { useDesktop } from "../store/desktop";
import { searchApps } from "../apps/registry";

export function Spotlight() {
  const { spotlightOpen, setSpotlight } = useUi();
  const { open } = useDesktop();
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const results = searchApps(query);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === " ") {
        e.preventDefault();
        setSpotlight(!spotlightOpen);
        setQuery("");
      }
      if (e.key === "Escape") setSpotlight(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [spotlightOpen]);

  useEffect(() => {
    if (spotlightOpen) setTimeout(() => ref.current?.focus(), 50);
  }, [spotlightOpen]);

  return (
    <AnimatePresence>
      {spotlightOpen && (
        <motion.div
          className="absolute inset-0 z-[9998] flex items-start justify-center overflow-y-auto px-3 pb-8 pt-12 sm:pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSpotlight(false)}
        >
          <motion.div
            className="w-full max-w-[min(500px,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-[#0a0a1a]/96 shadow-2xl backdrop-blur-xl overflow-hidden"
            initial={{ y: -16, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -16, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <span className="text-slate-600 text-sm">⌕</span>
              <input
                ref={ref}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps..."
                className="flex-1 bg-transparent text-slate-200 text-sm outline-none placeholder:text-slate-600"
              />
              <kbd className="text-[9px] text-slate-700 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                ESC
              </kbd>
            </div>
            {results.length > 0 && (
              <div className="py-1.5">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      open(a.id);
                      setSpotlight(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: a.iconBg }}
                    >
                      {a.icon}
                    </span>
                    <div className="text-left">
                      <div className="text-[12px] text-slate-200">
                        {a.label}
                      </div>
                      <div className="text-[9px] text-slate-600">
                        {a.keywords?.join(", ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
