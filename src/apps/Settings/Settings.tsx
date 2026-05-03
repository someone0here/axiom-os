import { useState } from "react";
import { useUi } from "../../store/ui";

const TABS = [
  { id: "appearance", label: "🎨 Appearance" },
  { id: "security", label: "🔒 Security" },
  { id: "sync", label: "☁️ Sync" },
  { id: "about", label: "ℹ️ About" },
];

export default function Settings() {
  const [tab, setTab] = useState("appearance");
  const { wallpaperIndex, wallpapers, setWallpaper } = useUi();
  const [msg, setMsg] = useState("");

  const doExport = async () => {
    const r = await window.axiom.syncExport();
    setMsg(
      r.success
        ? `Exported (${(r.size / 1024).toFixed(1)} KB)`
        : r.cancelled
          ? "Cancelled"
          : r.error || "Failed",
    );
  };
  const doImport = async () => {
    const r = await window.axiom.syncImport();
    setMsg(
      r.success
        ? "Imported. Restart app."
        : r.cancelled
          ? "Cancelled"
          : r.error || "Failed",
    );
  };

  const content = {
    appearance: (
      <div>
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3">
          Wallpaper
        </p>
        <div className="flex gap-2 flex-wrap">
          {wallpapers.map((wp, i) => (
            <button
              key={i}
              onClick={() => setWallpaper(i)}
              style={{ background: wp }}
              className={`w-16 h-10 rounded-lg border-2 transition-all ${i === wallpaperIndex ? "border-cyan-400" : "border-transparent hover:border-white/20"}`}
            />
          ))}
        </div>
      </div>
    ),
    security: (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Security Info
        </p>
        {[
          ["Encryption", "AES-256-GCM ✓", "text-green-400"],
          ["Key derivation", "scrypt"],
          ["Auto-lock", "5 minutes"],
          ["Panic shortcut", "Ctrl+Shift+L"],
        ].map(([l, v, c]) => (
          <div
            key={l}
            className="flex justify-between py-2 border-b border-white/[0.04] text-[11px]"
          >
            <span className="text-slate-400">{l}</span>
            <span className={c || "text-slate-600"}>{v}</span>
          </div>
        ))}
      </div>
    ),
    sync: (
      <div className="flex flex-col gap-3">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Offline Sync
        </p>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Export/import your encrypted vault as a portable{" "}
          <code className="text-cyan-500">.axiom</code> file.
        </p>
        <button
          onClick={doExport}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] hover:bg-cyan-500/[0.18] transition-all"
        >
          Export Vault
        </button>
        <button
          onClick={doImport}
          className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-slate-400 text-[11px] hover:bg-white/[0.05] transition-all"
        >
          Import Vault
        </button>
        {msg && (
          <p
            className={`text-[10px] ${msg.includes("port") || msg.includes("KB") ? "text-green-400" : "text-red-400"}`}
          >
            {msg}
          </p>
        )}
      </div>
    ),
    about: (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          About
        </p>
        {[
          ["Version", "1.0.0 Secure"],
          ["Encryption", "AES-256-GCM"],
          ["Database", "SQLite WAL"],
          ["Runtime", "Electron"],
        ].map(([l, v]) => (
          <div
            key={l}
            className="flex justify-between py-2 border-b border-white/[0.04] text-[11px]"
          >
            <span className="text-slate-400">{l}</span>
            <span className="text-slate-600">{v}</span>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div className="flex h-full">
      <div className="w-36 border-r border-white/[0.05] flex flex-col py-2 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-left px-4 py-2.5 text-[11px] transition-colors ${tab === t.id ? "text-cyan-400 bg-cyan-500/[0.07]" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-5 overflow-y-auto">{content[tab]}</div>
    </div>
  );
}
