/**
 * 見た目の進化(世界設定書 Phase 5b でげんたが承認:https://claude.ai/artifact/A33ABXNpMdXdt1CcguN3Hv)。
 * 今の成長データを「読む」だけの純粋関数。見た目のために数値を動かすことはしない。
 */
import { MAGIC_KEYS, MAGIC_LABELS, type Character, type MagicKey } from "../../schemas";
import { SPELLS } from "../academy/content";
import { P } from "./rules";

export const RANKS = [
  { id: "apprentice", name: "見習い", desc: "紺のローブと素朴な木の杖" },
  { id: "mage", name: "正魔法使い", desc: "寮の差し色が入ったローブと、自分で作った杖" },
  { id: "archmage", name: "上級魔法使い", desc: "刺繍のローブとマント、結晶の杖" },
] as const;

/** 系統の色(承認済みの案) */
export const SYSTEM_COLORS: Record<MagicKey, string> = {
  astral: "#b9cdf5", // 銀青
  mind: "#c8b4f0", // 淡い紫
  creation: "#e2bf6e", // 真鍮の金
  nature: "#9fd98a", // 若葉の緑
  elemental: "#e0584e", // 深紅
  ancient: "#e6a347", // 琥珀
};

const tierCount = (ch: Character, tier: "intermediate" | "advanced") => SPELLS.filter((s) => s.tier === tier && ch.learnedSpells.includes(s.id)).length;

/** 位(0=見習い・1=正魔法使い・2=上級魔法使い)と、次の位までの条件 */
export function rankOf(ch: Character) {
  const mid = tierCount(ch, "intermediate"), adv = tierCount(ch, "advanced");
  const r2 = ch.level >= P.rankArchmage.level && adv >= P.rankArchmage.adv;
  const r1 = ch.level >= P.rankMage.level && mid >= P.rankMage.mid;
  const index = r2 ? 2 : r1 ? 1 : 0;
  const next = index === 0
    ? [{ label: `レベル ${P.rankMage.level}`, met: ch.level >= P.rankMage.level, now: `${ch.level}` }, { label: `中級呪文 ${P.rankMage.mid}つ`, met: mid >= P.rankMage.mid, now: `${mid}` }]
    : index === 1
      ? [{ label: `レベル ${P.rankArchmage.level}`, met: ch.level >= P.rankArchmage.level, now: `${ch.level}` }, { label: `上級呪文 ${P.rankArchmage.adv}つ`, met: adv >= P.rankArchmage.adv, now: `${adv}` }]
      : [];
  return { index, ...RANKS[index], next };
}

/** いちばん高い魔法適性(と、2位が5以内なら2色) */
export function auraOf(ch: Character) {
  const list = MAGIC_KEYS.map((k) => ({ k, v: ch.magicAffinity[k].value ?? 0 })).sort((a, b) => b.v - a.v);
  const top = list[0], second = list[1];
  const level = P.auraSteps.filter((t) => top.v >= t).length; // 0〜3
  const colors = top.v <= 0 ? [] : second.v > 0 && top.v - second.v <= 5 ? [SYSTEM_COLORS[top.k], SYSTEM_COLORS[second.k]] : [SYSTEM_COLORS[top.k]];
  return { system: top.v > 0 ? top.k : null, label: top.v > 0 ? MAGIC_LABELS[top.k].name : "", value: top.v, level, colors };
}

/** 床の魔法陣:呪文を覚えた系統ごとに輪が1本、呪文が増えるほど紋様が細かく */
export function circleOf(ch: Character) {
  const known = [...ch.learnedSpells, ...ch.world.compounds];
  const systems = MAGIC_KEYS.filter((k) => SPELLS.some((s) => s.system === k && ch.learnedSpells.includes(s.id)));
  return { rings: systems.map((k) => ({ k, color: SYSTEM_COLORS[k] })), detail: Math.min(24, 6 + known.length * 2) };
}

/** 杖の光:いちばん高い適性の色、位が上がると大きく */
export function orbOf(ch: Character) {
  const a = auraOf(ch); const r = rankOf(ch).index;
  return { color: a.colors[0] ?? "#b49cff", scale: 1 + r * 0.25 };
}
