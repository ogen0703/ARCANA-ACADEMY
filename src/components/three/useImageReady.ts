import { useEffect, useState } from "react";
const cache = new Map<string, "ok" | "error">();
/** 画像が読み込めるか確かめる(読み込めなければ代わりの表示にする) */
export function useImageReady(src: string | undefined): "loading" | "ok" | "error" {
  const [st, setSt] = useState<"loading" | "ok" | "error">(() => (src ? cache.get(src) ?? "loading" : "error"));
  useEffect(() => {
    if (!src) { setSt("error"); return; }
    const c = cache.get(src); if (c) { setSt(c); return; }
    setSt("loading");
    const img = new Image(); let alive = true;
    img.onload = () => { cache.set(src, "ok"); if (alive) setSt("ok"); };
    img.onerror = () => { cache.set(src, "error"); if (alive) setSt("error"); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return st;
}
