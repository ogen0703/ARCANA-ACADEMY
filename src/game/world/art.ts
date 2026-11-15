import type { TimeKey } from "./ambience";
/**
 * 一枚絵のアート(ChatGPTで生成、docs/ART_PROMPTS.md)。public/art/ に置いたものを使い、
 * 無いあいだは3Dの仮の学院を表示する。位置の数値は画像に合わせて調整する。
 */
const base = import.meta.env.BASE_URL;
export const ART = {
  hall: { dawn: `${base}art/hall-dawn.webp`, day: `${base}art/hall-day.webp`, dusk: `${base}art/hall-dusk.webp`, night: `${base}art/hall-night.webp` } as Record<TimeKey, string>,
  hero: `${base}art/hero.webp`,
  /** 位ごとの立ち絵(Phase 5b)。無ければ hero.webp */
  heroRank: (r: number) => (r <= 0 ? `${base}art/hero.webp` : `${base}art/hero-${r === 1 ? "mage" : "archmage"}.webp`),
  areas: { academy: `${base}art/area-academy.webp`, library: `${base}art/area-library.webp`, archive: `${base}art/place-archive.webp`, sanctuary: `${base}art/sanctuary.webp`, arena: `${base}art/arena.webp`, ruins: `${base}art/place-temple.webp` } as Record<string, string>,
  /** 先生の立ち絵(透過) */
  teacher: (k: string) => `${base}art/teacher-${k}.webp`,
  /** 探索の場所 */
  place: (k: string) => `${base}art/place-${k}.webp`,
  /** 演習の相手 */
  foe: (k: string) => (k === "teacher" ? `${base}art/teacher-elemental.webp` : `${base}art/foe-${k}.webp`),
  arena: `${base}art/arena.webp`,
  sanctuary: `${base}art/sanctuary.webp`,
  /** 物語(Phase 5c):封印の祭壇、覚醒の姿、衣装 */
  altar: `${base}art/story-altar.webp`,
  awakened: `${base}art/hero-awakened.webp`,
  outfit: (id: string) => `${base}art/hero-${id}.webp`,
  /** 魔法生物(幼体・若体は young、成体は通常の絵) */
  creature: (id: string, stage: number) => (stage >= 2 ? [`${base}art/creature-${id}.webp`] : [`${base}art/creature-${id}-young.webp`, `${base}art/creature-${id}.webp`]),
  /** 学院の人たち(先生は授業の立ち絵) */
  npc: (id: string) => (id.startsWith("t-") ? `${base}art/teacher-${id.slice(2)}.webp` : `${base}art/npc-${id}.webp`),
};
/** 広間の画像の縦横比(1536×1024) */
export const HALL_ASPECT = 1.5;
/** 主人公の立ち絵の置き方(広間の画像に対する割合)。足元の位置・背の高さ・杖の光の玉の位置(立ち絵の中の割合) */
export const HERO_LAYOUT = { x: 0.5, feetY: 0.9, heightPct: 66, orb: { x: 0.131, y: 0.118 } };
/** 位ごとの立ち絵の、杖の光の玉の位置(立ち絵の中の割合)。絵を入れたら合わせる */
export const HERO_ORBS: Record<number, { x: number; y: number }> = { 0: HERO_LAYOUT.orb, 1: { x: 0.256, y: 0.047 }, 2: { x: 0.236, y: 0.062 } };
/** 位ごとの立ち絵の横幅÷高さ(相棒を体の横に置くため) */
export const HERO_ASPECTS: Record<number, number> = { 0: 617 / 1522, 1: 940 / 1522, 2: 1007 / 1522 };
/** 衣装の立ち絵の、杖の光の位置と横幅÷高さ。絵を入れたら合わせる */
export const OUTFIT_LAYOUT: Record<string, { orb: { x: number; y: number }; aspect: number }> = { house: { orb: { x: 0.148, y: 0.099 }, aspect: 745 / 1522 }, starheir: { orb: { x: 0.212, y: 0.081 }, aspect: 876 / 1522 } };
/** 床の魔法陣の中心と幅(広間の画像に対する割合) */
export const FLOOR = { x: 0.5, y: 0.775, widthPct: 56 };
