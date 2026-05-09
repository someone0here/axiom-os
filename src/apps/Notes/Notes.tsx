import { useState, useEffect } from "react";

interface Note {
  id: number;
  title: string;
  body: string;
  folder: string;
  pinned: boolean;
  updated: number;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sel, setSel] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.axiom.notesList().then((d: any) => {
      if (Array.isArray(d)) {
        setNotes(d);
        if (d.length) setSel(d[0]);
      }
      setLoading(false);
    });
  }, []);

  const save = async (note: Note) => {
    await window.axiom.notesSave(note);
    setNotes((n) => n.map((x) => (x.id === note.id ? note : x)));
  };

  const add = async () => {
    const res = await window.axiom.notesSave({
      title: "New Note",
      body: "",
      folder: "default",
      pinned: false,
    });
    if (res.success) {
      const n = {
        id: res.id,
        title: "New Note",
        body: "",
        folder: "default",
        pinned: false,
        updated: Date.now(),
      };
      setNotes((x) => [n, ...x]);
      setSel(n);
    }
  };

  const del = async (id: number) => {
    await window.axiom.notesDelete(id);
    const upd = notes.filter((n) => n.id !== id);
    setNotes(upd);
    setSel(upd[0] || null);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-slate-700">
        Loading...
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-300 md:flex-row">
      <div className="flex h-[min(38vh,220px)] shrink-0 flex-col border-b border-white/[0.05] md:h-auto md:w-44 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">
            Notes
          </span>
          <button
            onClick={add}
            className="text-cyan-400 text-base leading-none hover:text-cyan-300 transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => setSel(n)}
              className={`px-3 py-2 cursor-pointer border-b border-white/[0.03] ${sel?.id === n.id ? "bg-cyan-500/[0.07] border-l-2 border-l-cyan-500" : "hover:bg-white/[0.03]"}`}
            >
              <div className="text-[11px] font-medium truncate">{n.title}</div>
              <div className="text-[9px] text-slate-600 truncate mt-0.5">
                {n.body.slice(0, 40)}
              </div>
            </div>
          ))}
          {!notes.length && (
            <div className="px-3 py-4 text-[10px] text-slate-700">
              No notes yet.
            </div>
          )}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {sel ? (
          <>
            <input
              value={sel.title}
              onChange={(e) => setSel({ ...sel, title: e.target.value })}
              onBlur={() => save(sel)}
              className="px-4 py-3 bg-transparent border-b border-white/[0.05] text-slate-200 text-sm font-semibold outline-none"
            />
            <textarea
              value={sel.body}
              onChange={(e) => setSel({ ...sel, body: e.target.value })}
              onBlur={() => save(sel)}
              className="flex-1 px-4 py-3 bg-transparent text-slate-400 text-[12px] leading-relaxed outline-none resize-none"
              placeholder="Start writing..."
            />
            <div className="flex justify-end px-4 py-2 border-t border-white/[0.03]">
              <button
                onClick={() => del(sel.id)}
                className="text-[9px] text-slate-700 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[11px] text-slate-700">
            Click + to create a note
          </div>
        )}
      </div>
    </div>
  );
}
