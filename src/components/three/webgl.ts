/** WebGLが使えるか(使えない端末では2Dの表示にきりかえる) */
let cached: boolean | null = null;
export function hasWebGL(): boolean {
  if (cached != null) return cached;
  try {
    const c = document.createElement("canvas");
    cached = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { cached = false; }
  return cached;
}
export const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
