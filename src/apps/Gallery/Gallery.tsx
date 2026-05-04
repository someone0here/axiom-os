import { useState, useEffect } from "react";

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Map<number, string>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  useEffect(() => {
    window.axiom.filesList("/").then((d: any) => {
      if (Array.isArray(d)) {
        const imgs = d.filter((f: any) => f.mime?.startsWith("image/"));
        setImages(imgs);
        loadPreviews(imgs);
      }
      setLoading(false);
    });
  }, []);

  const loadPreviews = async (imgs: any[]) => {
    setLoadingPreviews(true);
    const map = new Map<number, string>();
    for (const img of imgs) {
      const res = await window.axiom.filesRead(img.id);
      if (res.success) {
        map.set(img.id, `data:${img.mime};base64,${res.data}`);
        setPreviews(new Map(map)); // update progressively
      }
    }
    setLoadingPreviews(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-[10px] text-slate-700">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col h-full relative">
      {/* Fullscreen viewer */}
      {selected && (
        <div
          className="absolute inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
          onClick={() => setSelected(null)}
        >
          <img
            src={selected}
            className="max-w-full max-h-full object-contain"
            alt=""
          />
          <div className="absolute top-3 right-3 text-white/30 text-[10px]">
            click to close
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
        <span className="text-[9px] text-slate-600 uppercase tracking-widest">
          {images.length} images
        </span>
        {loadingPreviews && (
          <span className="text-[9px] text-slate-700 animate-pulse">
            Loading previews...
          </span>
        )}
      </div>

      {!images.length ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-700">
          <span className="text-5xl opacity-20">🖼</span>
          <span className="text-[11px]">No images yet.</span>
          <span className="text-[9px] text-slate-800">
            Upload images via the Files app.
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() =>
                previews.get(img.id) && setSelected(previews.get(img.id)!)
              }
              className="aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.05] hover:border-white/20 cursor-pointer transition-all relative"
            >
              {previews.get(img.id) ? (
                <img
                  src={previews.get(img.id)}
                  className="w-full h-full object-cover"
                  alt={img.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-[8px] text-slate-700 animate-pulse">
                    Loading...
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
