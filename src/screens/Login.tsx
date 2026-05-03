import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  profileId: number | null;
  onSuccess: (id: number) => void;
  onBack: () => void;
}

export function Login({ profileId, onSuccess, onBack }: Props) {
  const [password, setPassword] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const isSetup = !profileId;

  const handle = async () => {
    if (loading || attempts >= 5) return;
    setLoading(true);
    setError("");
    try {
      if (isSetup) {
        if (newPw.length < 6) {
          setError("Minimum 6 characters");
          setLoading(false);
          return;
        }
        if (newPw !== confirmPw) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        await window.axiom.authSetup(newPw);
        const res = await window.axiom.authLogin(1, newPw);
        if (res.success) onSuccess(1);
        else setError("Setup succeeded but login failed");
      } else {
        const res = await window.axiom.authLogin(profileId!, password);
        if (res.success) {
          onSuccess(profileId!);
        } else {
          const a = attempts + 1;
          setAttempts(a);
          setPassword("");
          setError(
            a >= 5
              ? "Account locked — too many attempts"
              : `Incorrect password. ${5 - a} attempts left.`,
          );
        }
      }
    } catch {
      setError("An error occurred");
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-[#040409] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-80 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-purple-500/15 border border-white/10 flex items-center justify-center text-2xl">
          ◈
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-200">
            {isSetup ? "Create Password" : "AXIOM OS"}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {isSetup ? "Set your master password" : "Enter password to unlock"}
          </div>
        </div>
        {isSetup ? (
          <>
            <input
              type={showPw ? "text" : "password"}
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm outline-none focus:border-cyan-500/40 tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
            />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handle()}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm outline-none focus:border-cyan-500/40 tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
            />
          </>
        ) : (
          <div className="relative w-full">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handle()}
              disabled={attempts >= 5}
              autoFocus
              className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm outline-none focus:border-cyan-500/40 tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
            />
            <button
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-xs"
            >
              {showPw ? "🙈" : "👁"}
            </button>
          </div>
        )}
        {error && (
          <p className="text-[10px] text-red-400 text-center">{error}</p>
        )}
        <button
          onClick={handle}
          disabled={loading || attempts >= 5}
          className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/[0.18] transition-all disabled:opacity-30"
        >
          {loading ? "Verifying..." : isSetup ? "Create & Enter" : "Unlock"}
        </button>
        {!isSetup && (
          <button
            onClick={onBack}
            className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </motion.div>
  );
}
