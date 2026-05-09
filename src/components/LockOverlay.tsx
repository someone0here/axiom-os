import { useState } from "react";
import { motion } from "framer-motion";
import { useUi } from "../store/ui";
import { useAuth } from "../store/auth";

export function LockOverlay() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const { unlock } = useUi();
  const { profileId } = useAuth();

  const handle = async () => {
    if (!profileId) return;
    const res = await window.axiom.authLogin(profileId, pw);
    if (res.success) {
      unlock();
      setPw("");
      setError("");
    } else {
      setError("Incorrect password");
      setPw("");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-4xl mb-3">🔒</div>
      <p className="text-[9px] text-slate-700 tracking-widest uppercase mb-8">
        Screen Locked
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3 px-4">
        <input
          type="password"
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm text-center outline-none focus:border-cyan-500/40 tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
        />
        {error && (
          <p className="text-[10px] text-red-400 text-center">{error}</p>
        )}
        <button
          onClick={handle}
          className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/[0.18] transition-all"
        >
          Unlock
        </button>
      </div>
    </motion.div>
  );
}
