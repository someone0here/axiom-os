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

  // FIX: recovery phrase state — shown once after setup
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  // FIX: forgot password flow state
  const [showForgot, setShowForgot] = useState(false);
  const [recoverPhrase, setRecoverPhrase] = useState("");
  const [recoverNewPw, setRecoverNewPw] = useState("");
  const [recoverError, setRecoverError] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState(false);

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
        // FIX: cast because the global type predates recoveryPhrase being returned
        const res = await (window.axiom.authSetup(newPw) as Promise<{
          success: boolean;
          recoveryPhrase?: string;
        }>);
        if (res.success && res.recoveryPhrase) {
          setRecoveryPhrase(res.recoveryPhrase.split(" "));
          setShowRecovery(true);
        } else {
          setError("Setup failed");
        }
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

  const handleRecover = async () => {
    if (recoverLoading) return;
    setRecoverError("");
    if (!recoverPhrase.trim()) {
      setRecoverError("Please enter your recovery phrase");
      return;
    }
    if (recoverNewPw.length < 6) {
      setRecoverError("New password must be at least 6 characters");
      return;
    }
    setRecoverLoading(true);
    try {
      // FIX: cast because authRecover is absent from the stale global type
      const axiom = window.axiom as typeof window.axiom & {
        authRecover: (
          phrase: string,
          newPassword: string,
        ) => Promise<{ success: boolean; error?: string }>;
      };
      const res = await axiom.authRecover(recoverPhrase, recoverNewPw);
      if (res.success) {
        setRecoverSuccess(true);
      } else {
        setRecoverError(res.error ?? "Recovery phrase not recognized");
      }
    } catch {
      setRecoverError("An error occurred");
    }
    setRecoverLoading(false);
  };

  // FIX: recovery phrase display — shown once after first-time setup
  if (showRecovery) {
    return (
      <motion.div
        className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#040409] px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 sm:p-8">
          <div className="text-center">
            <div className="text-lg mb-1">⚠️</div>
            <div className="text-sm font-semibold text-slate-200">
              Write This Down
            </div>
            <div className="text-[10px] text-slate-600 mt-1">
              This is the ONLY way to recover your vault if you forget your
              password. Store it somewhere safe. It will never be shown again.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {recoveryPhrase.map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]"
              >
                <span className="text-[8px] text-slate-700 w-3">{i + 1}.</span>
                <span className="text-[11px] text-slate-300 font-mono">
                  {word}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              // Login immediately after the user acknowledges the phrase
              const res = await window.axiom.authLogin(1, newPw);
              setShowRecovery(false);
              if (res.success) {
                onSuccess(1);
              } else {
                setError("Setup succeeded but login failed");
              }
            }}
            className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/20 transition-all"
          >
            I Have Written These Down
          </button>
        </div>
      </motion.div>
    );
  }

  // FIX: forgot password / recovery flow
  if (showForgot) {
    return (
      <motion.div
        className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#040409] px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 sm:p-8">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-200">
              Recover Vault
            </div>
            <div className="text-[10px] text-slate-600 mt-1">
              Enter your 12-word recovery phrase and a new password
            </div>
          </div>

          {recoverSuccess ? (
            <>
              <div className="text-center">
                <div className="text-lg mb-1">✅</div>
                <div className="text-xs text-slate-300">
                  Password updated successfully
                </div>
                <div className="text-[10px] text-slate-600 mt-1">
                  You can now log in with your new password
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForgot(false);
                  setRecoverPhrase("");
                  setRecoverNewPw("");
                  setRecoverSuccess(false);
                }}
                className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/20 transition-all"
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <textarea
                placeholder="Enter your 12-word recovery phrase..."
                value={recoverPhrase}
                onChange={(e) => setRecoverPhrase(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-xs outline-none focus:border-cyan-500/40 font-mono placeholder:font-sans placeholder:text-slate-600 resize-none"
              />
              <input
                type="password"
                placeholder="New password"
                value={recoverNewPw}
                onChange={(e) => setRecoverNewPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRecover()}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-sm outline-none focus:border-cyan-500/40 tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
              />
              {recoverError && (
                <p className="text-[10px] text-red-400 text-center">
                  {recoverError}
                </p>
              )}
              <button
                onClick={handleRecover}
                disabled={recoverLoading}
                className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/[0.18] transition-all disabled:opacity-30"
              >
                {recoverLoading ? "Verifying..." : "Reset Password"}
              </button>
              <button
                onClick={() => setShowForgot(false)}
                className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
              >
                ← Back to login
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // Normal login / setup screen
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#040409] px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 sm:p-8">
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
          <>
            {/* FIX: forgot password link */}
            <button
              onClick={() => setShowForgot(true)}
              className="text-[9px] text-slate-700 hover:text-slate-400 transition-colors"
            >
              Forgot password? Use recovery phrase
            </button>
            <button
              onClick={onBack}
              className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
