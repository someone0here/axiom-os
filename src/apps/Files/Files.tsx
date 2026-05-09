import { useState, useEffect, useRef } from "react";

interface F {
  id: number;
  name: string;
  mime: string;
  size: number;
  folder: string;
}

const getIcon = (mime: string) => {
  if (mime.startsWith("image/")) return "🖼";
  if (mime.includes("pdf")) return "📄";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.includes("text") || mime.includes("markdown")) return "📝";
  return "📦";
};

const fmtSize = (b: number) =>
  b < 1024
    ? b + " B"
    : b < 1048576
      ? (b / 1024).toFixed(1) + " KB"
      : (b / 1048576).toFixed(1) + " MB";

interface PreviewState {
  type: "image" | "video" | "audio" | "text" | "pdf" | "unknown";
  data: string;
  name: string;
  mime: string;
}

export default function Files() {
  const [files, setFiles] = useState<F[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const load = async () => {
    const d = await window.axiom.filesList("/");
    if (Array.isArray(d)) setFiles(d);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      await window.axiom.filesUpload(await file.arrayBuffer(), file.name, "/");
    }
    await load();
    setUploading(false);
    e.target.value = "";
  };

  const openFile = async (file: F) => {
    setPreviewLoading(true);
    setPreview(null);
    const res = await window.axiom.filesRead(file.id);
    setPreviewLoading(false);
    if (!res.success) return;

    const dataUrl = `data:${file.mime};base64,${res.data}`;
    let type: PreviewState["type"] = "unknown";
    if (file.mime.startsWith("image/")) type = "image";
    else if (file.mime.startsWith("video/")) type = "video";
    else if (file.mime.startsWith("audio/")) type = "audio";
    else if (file.mime.includes("text") || file.mime.includes("markdown"))
      type = "text";
    else if (file.mime.includes("pdf")) type = "pdf";

    // For text files decode base64 to string
    let data = dataUrl;
    if (type === "text") {
      data = atob(res.data);
    }

    setPreview({ type, data, name: file.name, mime: file.mime });
  };

  const deleteFile = async (id: number) => {
    await window.axiom.filesDelete(id);
    setFiles((f) => f.filter((x) => x.id !== id));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setConfirmDelete(null);
  };

  const deleteSelected = async () => {
    for (const id of selected) {
      await window.axiom.filesDelete(id);
    }
    setFiles((f) => f.filter((x) => !selected.has(x.id)));
    setSelected(new Set());
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const downloadFile = async (file: F) => {
    const res = await window.axiom.filesRead(file.id);
    if (!res.success) return;
    const a = document.createElement("a");
    a.href = `data:${file.mime};base64,${res.data}`;
    a.download = file.name;
    a.click();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-slate-700 tracking-widest uppercase">
        Loading...
      </div>
    );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Preview Modal */}
      {(preview || previewLoading) && (
        <div
          className="absolute inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-slate-400 truncate max-w-[80%]">
              {preview?.name}
            </span>
            <div className="flex items-center gap-2">
              {preview && (
                <button
                  onClick={() =>
                    downloadFile({
                      id: 0,
                      name: preview.name,
                      mime: preview.mime,
                      size: 0,
                      folder: "/",
                    })
                  }
                  className="text-[10px] text-cyan-400 border border-cyan-500/25 px-3 py-1 rounded-lg hover:bg-cyan-500/10"
                >
                  Download
                </button>
              )}
              <button
                onClick={() => setPreview(null)}
                className="text-[11px] text-slate-600 hover:text-slate-300 px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-6 overflow-auto"
            onClick={() => setPreview(null)}
          >
            {previewLoading && (
              <div className="text-[10px] text-slate-700 tracking-widest uppercase animate-pulse">
                Opening...
              </div>
            )}
            {preview && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full"
              >
                {preview.type === "image" && (
                  <img
                    src={preview.data}
                    alt={preview.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                  />
                )}
                {preview.type === "video" && (
                  <video
                    src={preview.data}
                    controls
                    autoPlay
                    className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                  >
                    Your browser does not support video.
                  </video>
                )}
                {preview.type === "audio" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-5xl opacity-40">🎵</div>
                    <p className="text-[12px] text-slate-400">{preview.name}</p>
                    <audio
                      src={preview.data}
                      controls
                      autoPlay
                      className="mt-2"
                    />
                  </div>
                )}
                {preview.type === "text" && (
                  <pre className="text-[11px] text-slate-300 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 max-w-2xl max-h-[65vh] overflow-auto whitespace-pre-wrap font-mono">
                    {preview.data}
                  </pre>
                )}
                {preview.type === "pdf" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-5xl opacity-40">📄</div>
                    <p className="text-[11px] text-slate-500">
                      PDFs cannot be previewed inline.
                    </p>
                    <button
                      onClick={() =>
                        downloadFile({
                          id: 0,
                          name: preview.name,
                          mime: preview.mime,
                          size: 0,
                          folder: "/",
                        })
                      }
                      className="text-[11px] text-cyan-400 border border-cyan-500/25 px-4 py-2 rounded-lg hover:bg-cyan-500/10"
                    >
                      Download to view
                    </button>
                  </div>
                )}
                {preview.type === "unknown" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-5xl opacity-40">📦</div>
                    <p className="text-[11px] text-slate-500">
                      No preview available for this file type.
                    </p>
                    <button
                      onClick={() =>
                        downloadFile({
                          id: 0,
                          name: preview.name,
                          mime: preview.mime,
                          size: 0,
                          folder: "/",
                        })
                      }
                      className="text-[11px] text-cyan-400 border border-cyan-500/25 px-4 py-2 rounded-lg hover:bg-cyan-500/10"
                    >
                      Download
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete !== null && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center">
          <div className="mx-4 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0e0e1e] p-5 sm:p-6">
            <p className="text-[12px] text-slate-300 text-center">
              Delete this file permanently?
            </p>
            <p className="text-[10px] text-slate-600 text-center">
              This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteFile(confirmDelete)}
                className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] hover:bg-red-500/25"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-white/[0.07] text-slate-500 text-[11px] hover:bg-white/[0.04]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.05] px-2 py-2 sm:px-4">
        <span className="text-[9px] text-slate-600 flex-1 uppercase tracking-widest">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${files.length} files`}
        </span>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="text-[10px] text-red-400 border border-red-500/25 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Delete {selected.size}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-[10px] text-slate-500 border border-white/[0.07] px-3 py-1 rounded-lg hover:bg-white/[0.04]"
          >
            Deselect
          </button>
        )}
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={upload}
          multiple
        />
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="text-[10px] text-cyan-400 border border-cyan-500/25 px-3 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
        >
          {uploading ? "Uploading..." : "+ Upload"}
        </button>
      </div>

      {/* File Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
        {!files.length ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
            <span className="text-5xl opacity-20">📁</span>
            <span className="text-[11px]">No files yet.</span>
            <button
              onClick={() => ref.current?.click()}
              className="text-[10px] text-cyan-400 border border-cyan-500/25 px-4 py-2 rounded-lg hover:bg-cyan-500/10 mt-1"
            >
              Upload your first file
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
            {files.map((f) => (
              <div
                key={f.id}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all group
                  ${
                    selected.has(f.id)
                      ? "bg-cyan-500/[0.08] border-cyan-500/40"
                      : "bg-white/[0.025] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/15"
                  }`}
                onClick={() => openFile(f)}
              >
                {/* Select checkbox */}
                <div
                  onClick={(e) => toggleSelect(f.id, e)}
                  className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition-all
                    ${
                      selected.has(f.id)
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-white/20 opacity-0 group-hover:opacity-100"
                    }`}
                >
                  {selected.has(f.id) && (
                    <span className="text-[8px] text-black font-bold">✓</span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(f.id);
                  }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                >
                  ✕
                </button>

                {/* Icon */}
                <div className="text-3xl mt-1 select-none">
                  {getIcon(f.mime)}
                </div>

                {/* Name */}
                <span className="text-[8px] text-slate-400 text-center w-full truncate leading-tight">
                  {f.name}
                </span>

                {/* Size */}
                <span className="text-[7px] text-slate-700">
                  {fmtSize(f.size)}
                </span>

                {/* Action bar on hover */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFile(f);
                    }}
                    className="text-[8px] text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded hover:bg-cyan-500/10"
                  >
                    Open
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(f);
                    }}
                    className="text-[8px] text-slate-400 border border-white/10 px-2 py-0.5 rounded hover:bg-white/[0.06]"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
