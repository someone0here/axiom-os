import { useState, useEffect } from "react";

interface Entry {
  id: number;
  site: string;
  username: string;
  password: string;
  notes: string;
}

export default function Vault() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    site: "",
    username: "",
    password: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.axiom.vaultList().then((d: any) => {
      if (Array.isArray(d)) setEntries(d);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    const res = await window.axiom.vaultSave(form);
    if (res.success) {
      setEntries((e) => [...e, { ...form, id: res.id }]);
      setForm({ site: "", username: "", password: "", notes: "" });
      setAdding(false);
    }
  };

  const del = async (id: number) => {
    await window.axiom.vaultDelete(id);
    setEntries((e) => e.filter((x) => x.id !== id));
  };
  const copy = (t: string) => navigator.clipboard.writeText(t).catch(() => {});
  const tog = (id: number) =>
    setVisible((v) => {
      const n = new Set(v);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-slate-700">
        Loading vault...
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-3 sm:px-4">
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
          🔐 Password Vault
        </span>
        <button
          onClick={() => setAdding(true)}
          className="text-[10px] text-cyan-400 border border-cyan-500/25 px-3 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors"
        >
          + Add
        </button>
      </div>
      {adding && (
        <div className="mx-4 my-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2">
          {(["site", "username", "password", "notes"] as const).map((f) => (
            <input
              key={f}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              type={f === "password" ? "password" : "text"}
              value={form[f]}
              onChange={(e) => setForm((x) => ({ ...x, [f]: e.target.value }))}
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-slate-200 text-[11px] outline-none focus:border-cyan-500/30"
            />
          ))}
          <div className="flex gap-2 mt-1">
            <button
              onClick={save}
              className="flex-1 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] hover:bg-cyan-500/18"
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.07] text-slate-500 text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2 sm:px-4">
        {entries.map((e) => (
          <div
            key={e.id}
            className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]"
          >
            <div className="text-[11px] font-semibold text-slate-200">
              {e.site}
            </div>
            <div className="text-[9px] text-slate-600">{e.username}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 text-[10px] text-purple-400 font-mono truncate">
                {visible.has(e.id) ? e.password : "••••••••••••"}
              </code>
              <button
                onClick={() => tog(e.id)}
                className="text-[10px] text-slate-600 hover:text-slate-400"
              >
                {visible.has(e.id) ? "🙈" : "👁"}
              </button>
              <button
                onClick={() => copy(e.password)}
                className="text-[9px] text-slate-600 border border-white/[0.07] px-2 py-0.5 rounded hover:bg-white/[0.05]"
              >
                Copy
              </button>
              <button
                onClick={() => del(e.id)}
                className="text-[10px] text-slate-700 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {!entries.length && !adding && (
          <div className="flex items-center justify-center h-full text-[11px] text-slate-700">
            No passwords saved yet.
          </div>
        )}
      </div>
    </div>
  );
}
