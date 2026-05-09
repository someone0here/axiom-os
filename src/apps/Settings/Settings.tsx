import { useState, useEffect, type ReactElement } from "react";
import { useUi } from "../../store/ui";

const TABS = [
  { id: "appearance", label: "🎨 Appearance" },
  { id: "security", label: "🔒 Security" },
  { id: "sync", label: "☁️ Sync" },
  { id: "snapshots", label: "💾 Backups" },
  { id: "shortcuts", label: "⌨️ Shortcuts" },
  { id: "about", label: "ℹ️ About" },
];

export default function Settings() {
  const [tab, setTab] = useState("appearance");
  const { wallpaperIndex, wallpapers, setWallpaper } = useUi();
  const [msg, setMsg] = useState("");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotMsg, setSnapshotMsg] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (tab === "snapshots") loadSnapshots();
  }, [tab]);

  const loadSnapshots = async () => {
    const res = await window.axiom.snapshotsList();
    if (Array.isArray(res)) setSnapshots(res);
  };

  const createSnapshot = async () => {
    setCreating(true);
    const res = await window.axiom.snapshotsCreate(
      `Manual – ${new Date().toLocaleString()}`,
    );
    if (res.success) {
      setSnapshotMsg("Snapshot created successfully.");
      await loadSnapshots();
    } else {
      setSnapshotMsg(res.error || "Failed to create snapshot.");
    }
    setCreating(false);
    setTimeout(() => setSnapshotMsg(""), 3000);
  };

  const restoreSnapshot = async (id: number) => {
    if (!confirm("Restore this snapshot? Current data will be overwritten."))
      return;
    const res = await window.axiom.snapshotsRestore(id);
    setSnapshotMsg(
      res.success ? "Restored. Restart AXIOM." : res.error || "Failed.",
    );
  };

  const deleteSnapshot = async (id: number) => {
    await window.axiom.snapshotsDelete(id);
    await loadSnapshots();
  };

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

  const content: Record<string, ReactElement> = {
    appearance: (
      <div className="flex flex-col gap-5">
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
                className={`w-16 h-10 rounded-lg border-2 transition-all ${i === wallpaperIndex ? "border-cyan-400 scale-105" : "border-transparent hover:border-white/20"}`}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3">
            Theme
          </p>
          {[
            ["Accent Color", "Cyan"],
            ["Font", "System Default"],
            ["Animations", "Enabled"],
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
      </div>
    ),

    security: (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Security
        </p>
        {[
          ["Encryption", "AES-256-GCM ✓", "text-green-400"],
          ["Key derivation", "scrypt (N=16384)"],
          ["Auto-lock", "5 minutes"],
          ["Panic shortcut", "Ctrl/Cmd+Shift+L"],
          ["DevTools", "Disabled in release"],
          ["Source obfuscation", "Enabled"],
        ].map(([l, v, c]) => (
          <div
            key={l}
            className="flex justify-between py-2 border-b border-white/[0.04] text-[11px]"
          >
            <span className="text-slate-400">{l}</span>
            <span className={c || "text-slate-600"}>{v}</span>
          </div>
        ))}

        <div className="mt-4">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3">
            Actions
          </p>
          <button
            onClick={() => window.axiom.profilesLock()}
            className="w-full px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[11px] hover:bg-yellow-500/20 transition-all text-left"
          >
            🔒 Lock Screen Now
          </button>
        </div>
      </div>
    ),

    sync: (
      <div className="flex flex-col gap-3">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Offline Sync
        </p>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Export your entire encrypted vault as a{" "}
          <code className="text-cyan-500">.axiom</code> file. Import it on any
          device running AXIOM.
        </p>
        <button
          onClick={doExport}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] hover:bg-cyan-500/20 transition-all"
        >
          ↑ Export Vault
        </button>
        <button
          onClick={doImport}
          className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-slate-400 text-[11px] hover:bg-white/[0.05] transition-all"
        >
          ↓ Import Vault
        </button>
        {msg && (
          <p
            className={`text-[10px] ${msg.includes("KB") || msg.includes("port") ? "text-green-400" : "text-red-400"}`}
          >
            {msg}
          </p>
        )}
      </div>
    ),

    snapshots: (
      <div className="flex flex-col gap-3">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Vault Snapshots
        </p>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Snapshots are encrypted backups of your entire vault stored locally.
          Restore instantly if anything goes wrong.
        </p>
        <button
          onClick={createSnapshot}
          disabled={creating}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] hover:bg-cyan-500/20 transition-all disabled:opacity-40"
        >
          {creating ? "Creating..." : "+ Create Snapshot"}
        </button>
        {snapshotMsg && (
          <p
            className={`text-[10px] ${snapshotMsg.includes("success") || snapshotMsg.includes("Restored") ? "text-green-400" : "text-red-400"}`}
          >
            {snapshotMsg}
          </p>
        )}
        <div className="flex flex-col gap-2 mt-1">
          {snapshots.length === 0 && (
            <p className="text-[10px] text-slate-700 text-center py-4">
              No snapshots yet.
            </p>
          )}
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-300 truncate">
                  {s.label}
                </div>
                <div className="text-[9px] text-slate-700 mt-0.5">
                  {new Date(s.created * 1000).toLocaleString()} ·{" "}
                  {(s.size / 1024).toFixed(0)} KB
                </div>
              </div>
              <div className="flex gap-1.5 ml-2 flex-shrink-0">
                <button
                  onClick={() => restoreSnapshot(s.id)}
                  className="text-[9px] text-cyan-400 border border-cyan-500/25 px-2 py-1 rounded-lg hover:bg-cyan-500/10"
                >
                  Restore
                </button>
                <button
                  onClick={() => deleteSnapshot(s.id)}
                  className="text-[9px] text-red-400 border border-red-500/25 px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    shortcuts: (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          Keyboard Shortcuts
        </p>
        {[
          ["⌘ Space", "Spotlight search"],
          ["⌘ N", "Open Notes"],
          ["⌘ F", "Open Files"],
          ["⌘ V", "Open Vault"],
          ["⌘ T", "Open Terminal"],
          ["⌘ L", "Lock screen"],
          ["⌘ Shift C", "Open Chat"],
          ["Ctrl+Shift+L", "Panic lock"],
          ["Esc", "Exit fullscreen"],
        ].map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between py-2 border-b border-white/[0.04]"
          >
            <span className="text-[10px] text-slate-400">{v}</span>
            <kbd className="text-[9px] text-slate-600 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded font-mono">
              {k}
            </kbd>
          </div>
        ))}
      </div>
    ),

    about: (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">
          About AXIOM
        </p>
        {[
          ["Version", "1.0.0"],
          ["Build", "Secure Edition"],
          ["Encryption", "AES-256-GCM"],
          ["Database", "SQLite WAL"],
          ["Runtime", "Electron"],
          ["Chat", "Nostr NIP-04"],
        ].map(([l, v]) => (
          <div
            key={l}
            className="flex justify-between py-2 border-b border-white/[0.04] text-[11px]"
          >
            <span className="text-slate-400">{l}</span>
            <span className="text-slate-600">{v}</span>
          </div>
        ))}
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[9px] text-slate-700 leading-relaxed text-center">
            Built for privacy. No telemetry. No cloud. No accounts.
            <br />
            Your data is yours — always.
          </p>
        </div>
      </div>
    ),
  };

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="flex shrink-0 flex-row gap-0.5 overflow-x-auto border-b border-white/[0.05] py-1.5 md:w-40 md:flex-col md:gap-0 md:border-b-0 md:border-r md:py-2 md:overflow-y-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[10px] transition-colors sm:text-[11px] md:w-full md:rounded-none md:px-4 md:py-2.5 ${tab === t.id ? "text-cyan-400 bg-cyan-500/[0.07]" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {content[tab]}
      </div>
    </div>
  );
}
