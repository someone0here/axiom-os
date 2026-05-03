import { useState, useRef, useEffect } from "react";
import { useDesktop } from "../../store/desktop";
import { useUi } from "../../store/ui";

type LineType = "input" | "output" | "error" | "success";
interface Line {
  type: LineType;
  text: string;
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: "success", text: "AXIOM Terminal v1.0.0" },
    { type: "output", text: 'Type "help" for available commands.' },
  ]);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const bottom = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const { open } = useDesktop();
  const { lock } = useUi();
  const add = (type: LineType, text: string) =>
    setLines((l) => [...l, { type, text }]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const run = (cmd: string) => {
    const parts = cmd.trim().split(" ");
    const c = parts[0].toLowerCase();
    if (!c) return;
    add("input", `axiom@vault:~$ ${cmd}`);
    setHist((h) => [cmd, ...h.slice(0, 49)]);
    setHi(-1);
    if (c === "help")
      [
        "help",
        "clear",
        "lock",
        "whoami",
        "date",
        "echo [msg]",
        "open [app]",
        "ls",
        "shutdown",
      ].forEach((x) => add("output", "  " + x));
    else if (c === "clear") setLines([]);
    else if (c === "lock") {
      lock();
      add("success", "Screen locked.");
    } else if (c === "whoami") add("output", "axiom-user  uid=1000");
    else if (c === "date") add("output", new Date().toString());
    else if (c === "echo") add("output", parts.slice(1).join(" "));
    else if (c === "open") {
      const a = parts[1];
      ["notes", "files", "vault", "terminal", "settings", "gallery"].includes(a)
        ? (open(a), add("success", `Opening ${a}...`))
        : add("error", `unknown app: ${a || "(none)"}`);
    } else if (c === "shutdown") {
      add("success", "Shutting down...");
      setTimeout(() => window.axiom.winClose(), 1200);
    } else add("error", `command not found: ${c}`);
  };

  const colors: Record<LineType, string> = {
    input: "text-cyan-400",
    output: "text-slate-500",
    error: "text-red-400",
    success: "text-green-400",
  };

  return (
    <div
      className="flex flex-col h-full bg-[#020206] font-mono"
      onClick={() => inp.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto p-3 text-[11px] leading-6">
        {lines.map((l, i) => (
          <div key={i} className={colors[l.type]}>
            {l.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.05]">
        <span className="text-cyan-400 text-[11px] flex-shrink-0">
          axiom@vault:~$
        </span>
        <input
          ref={inp}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              run(input);
              setInput("");
            } else if (e.key === "ArrowUp") {
              const i = Math.min(hi + 1, hist.length - 1);
              setHi(i);
              setInput(hist[i] || "");
            } else if (e.key === "ArrowDown") {
              const i = Math.max(hi - 1, -1);
              setHi(i);
              setInput(i < 0 ? "" : hist[i]);
            }
          }}
          className="flex-1 bg-transparent text-slate-200 text-[11px] outline-none"
        />
      </div>
    </div>
  );
}
