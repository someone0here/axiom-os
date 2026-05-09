import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    icon: "🔐",
    color: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/20",
    title: "Your vault is ready",
    desc: "Everything in AXIOM is encrypted with AES-256-GCM. Your password never leaves this device. Not even we can read your data.",
    highlight: "Military-grade encryption",
    highlightColor: "text-cyan-400",
  },
  {
    icon: "📝",
    color: "from-yellow-500/20 to-yellow-500/5",
    border: "border-yellow-500/20",
    title: "Write privately",
    desc: "Notes, files, and passwords are encrypted the moment you type them. Everything is stored locally — no cloud, no sync to any server.",
    highlight: "100% local storage",
    highlightColor: "text-yellow-400",
  },
  {
    icon: "💬",
    color: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/20",
    title: "Chat anonymously",
    desc: "Open Chat to generate your AXIOM ID — a unique cryptographic identity. No email. No phone. Share your ID with friends to message them encrypted.",
    highlight: "Zero-knowledge identity",
    highlightColor: "text-purple-400",
  },
  {
    icon: "⌨️",
    color: "from-green-500/20 to-green-500/5",
    border: "border-green-500/20",
    title: "You're all set",
    desc: "Press Cmd+Space to search everything. Use the dock to open apps. Your data is yours — always encrypted, always private.",
    highlight: "Welcome to AXIOM",
    highlightColor: "text-green-400",
  },
];

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#040409] px-4 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-96 h-96 rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #00d4ff, transparent)",
          }}
        />
      </div>

      {/* Logo */}
      <div className="text-[10px] font-black tracking-[5px] uppercase mb-12 opacity-40">
        <span className="text-cyan-400">AX</span>
        <span className="text-purple-400">IOM</span>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className={`w-full max-w-sm px-5 py-6 sm:p-8 rounded-2xl bg-gradient-to-b ${current.color} border ${current.border} flex flex-col items-center gap-5 text-center mx-4`}
        >
          {/* Icon */}
          <div className="text-5xl">{current.icon}</div>

          {/* Title */}
          <div>
            <div className="text-sm font-semibold text-slate-200 mb-2">
              {current.title}
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              {current.desc}
            </div>
          </div>

          {/* Highlight badge */}
          <div
            className={`text-[9px] font-bold tracking-widest uppercase ${current.highlightColor} bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-full`}
          >
            {current.highlight}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Step dots */}
      <div className="flex gap-2 mt-8">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all ${
              i === step
                ? "w-5 h-1.5 bg-cyan-400"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-2.5 rounded-xl border border-white/[0.07] text-slate-500 text-[11px] hover:bg-white/[0.04] transition-all"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
          className="px-8 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] font-bold tracking-wider uppercase hover:bg-cyan-500/20 transition-all"
        >
          {isLast ? "Enter AXIOM →" : "Next →"}
        </button>
      </div>

      {/* Skip */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="mt-4 text-[9px] text-slate-800 hover:text-slate-600 transition-colors"
        >
          Skip
        </button>
      )}
    </motion.div>
  );
}
