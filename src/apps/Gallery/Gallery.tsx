import { useState, useEffect } from "react";

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.axiom.filesList("/").then((d: any) => {
      if (Array.isArray(d))
        setImages(d.filter((f: any) => f.mime?.startsWith("image/")));
      setLoading(false);
    });
  }, []);

  const open = async (id: number, mime: string) => {
    const res = await window.axiom.filesRead(id);
    if (res.success) setPreview(`data:${mime};base64,${res.data}`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-slate-700">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col h-full relative">
      {preview && (
        <div
          className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            className="max-w-full max-h-full object-contain rounded-lg"
            alt=""
          />
          <div className="absolute top-3 right-3 text-white/40 text-xs">
            click to close
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-b border-white/[0.05]">
        <span className="text-[9px] text-slate-600 uppercase tracking-widest">
          {images.length} images
        </span>
      </div>
      {!images.length ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-slate-700">
          <span className="text-4xl opacity-20">🖼</span>
          <span className="text-[11px]">Upload images via Files app.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => open(img.id, img.mime)}
              className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.05] hover:border-white/20 cursor-pointer flex items-center justify-center text-4xl opacity-60 hover:opacity-100 transition-all"
            >
              🖼
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
