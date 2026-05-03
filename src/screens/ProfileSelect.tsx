import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Profile {
  id: number;
  label: string;
  isDecoy: boolean;
}

export function ProfileSelect({
  onSelect,
}: {
  onSelect: (id: number) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    window.axiom.profilesList().then(setProfiles);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-[#040409] flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-[9px] font-bold tracking-[5px] uppercase mb-1">
        <span className="text-cyan-400">AX</span>
        <span className="text-purple-500">IOM</span>
      </div>
      <p className="text-[9px] text-slate-700 tracking-widest uppercase mb-10">
        Select Profile
      </p>
      <div className="flex gap-4 flex-wrap justify-center px-8">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] transition-all w-32"
          >
            <div className="w-14 h-14 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-2xl">
              {p.isDecoy ? "🎭" : "◈"}
            </div>
            <span className="text-[11px] text-slate-300">{p.label}</span>
          </button>
        ))}
        <button
          onClick={() => onSelect(0)}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-dashed border-white/[0.07] hover:border-cyan-500/30 transition-all w-32"
        >
          <div className="w-14 h-14 rounded-full border border-dashed border-white/15 flex items-center justify-center text-white/20 text-xl">
            +
          </div>
          <span className="text-[11px] text-slate-700">New Profile</span>
        </button>
      </div>
    </motion.div>
  );
}
