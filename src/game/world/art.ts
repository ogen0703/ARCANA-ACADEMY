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
  /** 先生の立ち絵(透過) */
  teacher: (k: string) => `${base}art/teacher-${k}.webp`,
};
/** 広間の画像の縦横比(1536×1024) */
export const HALL_ASPECT = 1.5;
/** 主人公の立ち絵の置き方(広間の画像に対する割合)。足元の位置・背の高さ・杖の光の玉の位置(立ち絵の中の割合) */
export const HERO_LAYOUT = { x: 0.5, feetY: 0.9, heightPct: 66, orb: { x: 0.131, y: 0.118 } };
/** 床の魔法陣の中心と幅(広間の画像に対する割合) */
export const FLOOR = { x: 0.5, y: 0.775, widthPct: 56 };
