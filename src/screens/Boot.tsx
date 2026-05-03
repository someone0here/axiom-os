// src/screens/Boot.tsx
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Initializing AXIOM core...",
  "Loading cryptographic modules...",
  "Mounting secure vault...",
  "Verifying integrity...",
  "Decrypting storage layers...",
  "Launching desktop environment...",
];

export function Boot({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setProgress(Math.round((i / MESSAGES.length) * 100));
      setMsgIndex(Math.min(i, MESSAGES.length - 1));
      if (i >= MESSAGES.length) {
        clearInterval(iv);
        setTimeout(onComplete, 600);
      }
    }, 480);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-[#040409] flex flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5 } }}
    >
      {/* Logo ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="w-20 h-20 rounded-full border-2 border-transparent"
        style={{
          background:
            "linear-gradient(#040409,#040409) padding-box, linear-gradient(135deg,#00d4ff,#8b5cf6) border-box",
        }}
      >
        <div className="flex items-center justify-center h-full text-2xl font-black bg-gradient-to-br from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          AX
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5 text-xl font-bold tracking-[8px] uppercase text-slate-300"
      >
        AXIOM
      </motion.h1>

      {/* Progress bar */}
      <div className="mt-8 w-56 h-[2px] bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-3 text-[9px] tracking-[2px] uppercase text-slate-600"
        >
          {MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
