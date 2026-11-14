import type { TimeKey } from "./ambience";
/**
 * 一枚絵のアート(ChatGPTで生成、docs/ART_PROMPTS.md)。public/art/ に置いたものを使い、
 * 無いあいだは3Dの仮の学院を表示する。位置の数値は画像に合わせて調整する。
 */
const base = import.meta.env.BASE_URL;
export const ART = {
  hall: { dawn: `${base}art/hall-dawn.webp`, day: `${base}art/hall-day.webp`, dusk: `${base}art/hall-dusk.webp`, night: `${base}art/hall-night.webp` } as Record<TimeKey, string>,
  hero: `${base}art/hero.webp`,
  areas: { academy: `${base}art/area-academy.webp`, library: `${base}art/area-library.webp` } as Record<string, string>,
};
/** 主人公の立ち絵の置き方(広間の高さに対する%)と、杖の光の玉の位置(立ち絵の中の割合) */
export const HERO_LAYOUT = { heightPct: 80, bottomPct: 4, orb: { x: 0.8, y: 0.16 } };
/** 床の魔法陣の中心(広間の画像の中の割合) */
export const FLOOR = { x: 0.5, y: 0.86, widthPct: 62 };
