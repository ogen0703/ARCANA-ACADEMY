import * as THREE from "three";
/** 床の魔法陣(オリジナルの幾何学模様)を2Dキャンバスに描いてテクスチャにする */
export function makeMagicCircleTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const m = size / 2;
  g.translate(m, m);
  g.strokeStyle = "rgba(244,214,140,1)";
  g.shadowColor = "rgba(190,160,255,0.9)";
  g.shadowBlur = size * 0.02;
  const ring = (r: number, w: number, dash?: number[]) => { g.lineWidth = w; g.setLineDash(dash ?? []); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(m * 0.97, size * 0.006);
  ring(m * 0.9, size * 0.003, [size * 0.01, size * 0.015]);
  ring(m * 0.62, size * 0.004);
  ring(m * 0.3, size * 0.003);
  g.setLineDash([]);
  // 外周の目盛り
  for (let i = 0; i < 48; i++) {
    g.save(); g.rotate((i / 48) * Math.PI * 2);
    g.lineWidth = i % 4 === 0 ? size * 0.006 : size * 0.002;
    g.beginPath(); g.moveTo(0, -m * 0.97); g.lineTo(0, -m * (i % 4 === 0 ? 0.84 : 0.9)); g.stroke();
    g.restore();
  }
  // 七つの能力にちなんだ七芒星
  const star = (n: number, step: number, r: number) => {
    g.lineWidth = size * 0.004; g.beginPath();
    for (let i = 0; i <= n; i++) { const a = ((i * step) / n) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  };
  star(7, 3, m * 0.62);
  star(7, 2, m * 0.3);
  // 頂点の小円
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 - Math.PI / 2; g.lineWidth = size * 0.003; g.beginPath(); g.arc(Math.cos(a) * m * 0.76, Math.sin(a) * m * 0.76, m * 0.06, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
