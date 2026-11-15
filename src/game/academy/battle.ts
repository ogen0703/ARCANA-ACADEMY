/**
 * 戦闘(決闘演習場)の中身とルール(世界設定書 Phase 4c でげんたが承認:https://claude.ai/artifact/XEFpYQinbFvCXtoJweQbPj)。
 * 純粋関数。基本ステータス・性格・魔法の兆しは変えない(読むだけ)。乱数は戦闘ごとの種から決まるので、同じコマンドなら同じ結果になる。
 */
import type { Character, StatKey } from "../../schemas";
import { COURSES, spellById } from "./content";
import { proficiencyOf } from "./engine";
import { companionSupport } from "./creaturesEngine";

export type FoeMove = "strike" | "quick" | "intimidate" | "charge" | "heavy";
export type Opponent = { id: string; name: string; hp: number; atk: number; desc: string; shell?: boolean; pattern: FoeMove[]; good: string[]; exp: number; reward: string; title?: string };
export const OPPONENTS: Opponent[] = [
  { id: "dummy", name: "藁と石の演習人形", hp: 30, atk: 5, desc: "まっすぐ殴るだけ。フォルトナー先生の練習台", pattern: ["strike"], good: [], exp: 5, reward: "stardust" },
  { id: "wisp", name: "跳ねる灯り玉", hp: 28, atk: 6, desc: "素早く、先に動く", pattern: ["quick", "quick", "strike"], good: ["nature-1"], exp: 7, reward: "glowmoss" },
  { id: "shadow", name: "書架の影", hp: 40, atk: 6, desc: "禁書庫から迷い出た影。威圧で精神力を削る", pattern: ["strike", "intimidate", "strike"], good: ["mind-1", "mind-2"], exp: 9, reward: "violetink", title: "影を鎮めた者" },
  { id: "golem", name: "試作ゴーレム", hp: 60, atk: 9, desc: "ケスター先生の試作品。硬い殻をもち、力をためて大打撃", shell: true, pattern: ["strike", "charge", "heavy"], good: ["ancient-2", "creation-2", "astral-2"], exp: 12, reward: "starshard" },
  { id: "echo", name: "星の残響", hp: 70, atk: 10, desc: "廃神殿の祭壇の守り。3手をくり返す", pattern: ["intimidate", "charge", "heavy"], good: ["ancient-1", "astral-2"], exp: 15, reward: "staremblem", title: "星の残響を鎮めた者" },
  { id: "teacher", name: "模擬決闘 フォルトナー先生", hp: 90, atk: 11, desc: "すべての型を使う。1〜5に勝つと挑める", shell: true, pattern: ["quick", "intimidate", "charge", "heavy", "strike"], good: [], exp: 15, reward: "starshard", title: "先生に認められた者" },
];
export const opponentById = (id: string) => OPPONENTS.find((o) => o.id === id);
export const FIRST_WIN_TITLE = "演習場の新人";
export const BATTLE = { rewardsPerDay: 3, maxTurns: 10, mpRegen: 2, staff: 4, staffWand: 6, guardMp: 3, guardSp: 5, intimidateSp: 12, shieldBlock: 8, heavyMult: 2.5 };

/** 呪文の戦闘での効果(設定書の表) */
type SpellFx = { mp: number; kind: "attack" | "light" | "foresee" | "calm" | "resonate" | "shield" | "net" | "vines" | "heal" | "read" | "unseal"; power?: number; first?: boolean };
export const SPELL_FX: Record<string, SpellFx> = {
  "elemental-1": { mp: 3, kind: "attack", power: 8 },
  "elemental-2": { mp: 6, kind: "attack", power: 14, first: true },
  "astral-1": { mp: 2, kind: "light" },
  "astral-2": { mp: 4, kind: "foresee" },
  "mind-1": { mp: 3, kind: "calm" },
  "mind-2": { mp: 5, kind: "resonate" },
  "creation-1": { mp: 3, kind: "shield" },
  "creation-2": { mp: 6, kind: "net" },
  "nature-1": { mp: 3, kind: "vines" },
  "nature-2": { mp: 5, kind: "heal" },
  "ancient-1": { mp: 2, kind: "read" },
  "ancient-2": { mp: 5, kind: "unseal" },
};
export const FX_TEXT: Record<SpellFx["kind"], string> = {
  attack: "攻撃", light: "次の攻撃1.5倍", foresee: "次の行動を1回かわす", calm: "精神力+15", resonate: "相手の攻撃力2ターン半分", shield: "次の痛手-8",
  net: "相手を1ターン止める", vines: "素早さを消す・3ターン痛手2", heal: "体力+20", read: "相手の次の3手がわかる", unseal: "硬い殻・ためた力を解く",
};
export const MOVE_TEXT: Record<FoeMove, { clear: string; vague: string }> = {
  strike: { clear: "殴りかかろうとしている", vague: "動こうとしている" },
  quick: { clear: "素早く飛びかかろうとしている", vague: "落ち着きなく動いている" },
  intimidate: { clear: "威圧しようとしている(精神力が削られる)", vague: "じっとこちらを見ている" },
  charge: { clear: "力をためようとしている", vague: "動こうとしている" },
  heavy: { clear: "ためた力を放とうとしている(大打撃)", vague: "ただならぬ気配がする" },
};

export type Companion = NonNullable<ReturnType<typeof companionSupport>>;
export type Ctx = { stats: Character["basicStats"]; spells: string[]; prof: Record<string, number>; wand: boolean; companion?: Companion | null };
export const ctxOf = (ch: Character): Ctx => ({ stats: ch.basicStats, spells: ch.learnedSpells.filter((s) => SPELL_FX[s]), prof: Object.fromEntries(Object.keys(COURSES).map((k) => [k, proficiencyOf(ch, k as never)])), wand: !!ch.history.wand, companion: companionSupport(ch) });
export const maxes = (c: Ctx) => ({ hp: Math.round(40 + c.stats.physical), mp: Math.round(20 + (c.stats.intellect + c.stats.creativity) * 0.5), sp: Math.round(20 + c.stats.spirit) });

export type State = {
  opp: string; turn: number; seed: number;
  me: { hp: number; mp: number; sp: number }; max: { hp: number; mp: number; sp: number };
  foe: { hp: number; max: number; shell: boolean; charged: boolean; weak: number; vines: number; netted: boolean; step: number };
  buff: { mult: number; shield: number; dodge: boolean };
  stunned: boolean; reveal: number; log: string[]; over: null | "win" | "lose" | "draw" | "retreat";
  /** 相棒の手助けは1戦に1回 */
  companionUsed?: boolean;
};

const rnd = (s: State) => { s.seed = (s.seed * 1103515245 + 12345) >>> 0; return (s.seed % 1000) / 1000; };
export function startBattle(c: Ctx, oppId: string, seed: number): State {
  const o = opponentById(oppId)!; const m = maxes(c);
  return { opp: oppId, turn: 1, seed: seed >>> 0, me: { ...m }, max: m, foe: { hp: o.hp, max: o.hp, shell: !!o.shell, charged: false, weak: 0, vines: 0, netted: false, step: 0 }, buff: { mult: 1, shield: 0, dodge: false }, stunned: false, reveal: 0, log: [`${o.name}が現れた。`], over: null };
}
export const nextMoves = (s: State, n: number) => { const p = opponentById(s.opp)!.pattern; return Array.from({ length: n }, (_, i) => p[(s.foe.step + i) % p.length]); };
/** 相手の次の行動の気配(感受性20以上ではっきり。古文字の解読で3手) */
export function hint(s: State, c: Ctx) {
  const mv = nextMoves(s, s.reveal > 0 ? 3 : 1);
  return { clear: c.stats.sensitivity >= 20 || s.reveal > 0, moves: mv, text: mv.map((m) => (c.stats.sensitivity >= 20 || s.reveal > 0 ? MOVE_TEXT[m].clear : MOVE_TEXT[m].vague)) };
}
const statFor: Record<string, StatKey> = Object.fromEntries(Object.values(COURSES).map((c) => [c.key, c.stat]));
function spellDamage(c: Ctx, id: string, base: number) {
  const sys = spellById(id)!.system;
  return base * (1 + c.stats[statFor[sys]] / 100) * (1 + (c.prof[sys] ?? 0) / 200);
}

export type Command = { type: "spell"; id: string } | { type: "staff" } | { type: "guard" } | { type: "retreat" } | { type: "companion" };
/** 1ターン進める(元の State は変えない) */
export function step(prev: State, c: Ctx, cmd: Command): State {
  if (prev.over) return prev;
  const s: State = structuredClone(prev);
  const o = opponentById(s.opp)!;
  const say = (t: string) => s.log.push(t);
  if (cmd.type === "retreat") { s.over = "retreat"; say("演習をやめた。"); return s; }
  const move = nextMoves(s, 1)[0];
  const foeFirst = move === "quick" && s.foe.vines === 0 && !(cmd.type === "spell" && SPELL_FX[cmd.id]?.first);
  let guard = false;

  const hitFoe = (raw: number) => {
    let d = raw * s.buff.mult; s.buff.mult = 1;
    if (s.foe.shell) d /= 2;
    const dmg = Math.max(1, Math.round(d));
    s.foe.hp = Math.max(0, s.foe.hp - dmg);
    say(`${o.name}に ${dmg} の痛手${s.foe.shell ? "(硬い殻で半分)" : ""}。`);
  };
  const myAction = () => {
    if (s.stunned) { s.stunned = false; say("心が揺れて、動けなかった。"); return; }
    if (cmd.type === "staff") { hitFoe((c.wand ? BATTLE.staffWand : BATTLE.staff) * (1 + c.stats.physical / 100)); return; }
    if (cmd.type === "companion") {
      const cp = c.companion;
      if (!cp) throw new Error("相棒がいない");
      if (s.companionUsed) throw new Error("相棒の手助けは1戦に1回");
      s.companionUsed = true;
      say(`相棒の${cp.name}が手を貸した!`);
      switch (cp.kind) {
        case "light": s.buff.mult = 1.5; say("弱点が照らし出された(次の攻撃1.5倍)。"); break;
        case "calm": s.me.sp = Math.min(s.max.sp, s.me.sp + Math.round(cp.power * cp.mult)); say("心が整った。"); break;
        case "shield": s.buff.shield = Math.round(cp.power * cp.mult); say("小さな盾ができた。"); break;
        case "heal": s.me.hp = Math.min(s.max.hp, s.me.hp + Math.round(cp.power * cp.mult)); say("体力を分けてもらった。"); break;
        case "attack": hitFoe(cp.power * cp.mult * (1 + c.stats.bond / 100)); break;
        case "unseal": if (s.foe.shell || s.foe.charged) { s.foe.shell = false; s.foe.charged = false; say("硬い殻とためた力が解けた。"); } else say("解くものはなかった。"); break;
        case "net": s.foe.netted = true; say(`風が${o.name}の動きを止めた。`); break;
      }
      return;
    }
    if (cmd.type === "guard") { guard = true; s.me.mp = Math.min(s.max.mp, s.me.mp + BATTLE.guardMp); s.me.sp = Math.min(s.max.sp, s.me.sp + BATTLE.guardSp); say("構えて、息を整えた。"); return; }
    const fx = SPELL_FX[cmd.id];
    if (!fx || !c.spells.includes(cmd.id)) throw new Error("その呪文は使えません");
    if (s.me.mp < fx.mp) throw new Error("魔力が足りない");
    s.me.mp -= fx.mp;
    const name = spellById(cmd.id)!.name;
    say(`「${name}」!`);
    switch (fx.kind) {
      case "attack": hitFoe(spellDamage(c, cmd.id, fx.power!)); break;
      case "light": s.buff.mult = 1.5; say("相手の弱点が照らし出された(次の攻撃1.5倍)。"); break;
      case "foresee": s.buff.dodge = true; say("相手の次の動きが見えた。"); break;
      case "calm": s.me.sp = Math.min(s.max.sp, s.me.sp + 15); say("心が静まった(精神力+15)。"); break;
      case "resonate": s.foe.weak = 2; say(`${o.name}の勢いがやわらいだ(2ターン攻撃半分)。`); break;
      case "shield": s.buff.shield = BATTLE.shieldBlock; say("小さな盾を形づくった。"); break;
      case "net": s.foe.netted = true; say(`光の網が${o.name}をとらえた。`); break;
      case "vines": s.foe.vines = 3; say("つる草が相手に絡みついた。"); break;
      case "heal": s.me.hp = Math.min(s.max.hp, s.me.hp + 20); say("体力が回復した(+20)。"); break;
      case "read": s.reveal = 3; say("相手の動きの並びが読めた。"); break;
      case "unseal": if (s.foe.shell || s.foe.charged) { s.foe.shell = false; s.foe.charged = false; say("硬い殻とためた力が解けた。"); } else say("解くものはなかった。"); break;
    }
  };
  const hurtMe = (raw: number) => {
    if (s.buff.dodge) { s.buff.dodge = false; say("見切ってかわした。"); return; }
    let d = raw * (s.foe.weak > 0 ? 0.5 : 1) * (guard ? 0.5 : 1);
    d = Math.max(0, Math.round(d) - s.buff.shield); if (s.buff.shield) { say("盾が受け止めた。"); s.buff.shield = 0; }
    s.me.hp = Math.max(0, s.me.hp - d); say(`${d} の痛手を受けた。`);
  };
  const foeAction = () => {
    s.foe.step++;
    if (s.foe.hp <= 0) return;
    if (s.foe.netted) { s.foe.netted = false; say(`${o.name}は動けない。`); return; }
    switch (move) {
      case "strike": case "quick": say(`${o.name}の攻撃。`); hurtMe(o.atk); break;
      case "intimidate": {
        say(`${o.name}の威圧。`);
        if (s.buff.dodge) { s.buff.dodge = false; say("見切って受け流した。"); break; }
        s.me.sp = Math.max(0, s.me.sp - BATTLE.intimidateSp); hurtMe(2);
        if (s.me.sp === 0) {
          if (rnd(s) < c.stats.willpower / 100) { s.me.sp = 1; say("意志の力で踏みとどまった。"); }
          else { s.stunned = true; s.me.sp = Math.round(s.max.sp * 0.3); say("心が揺れた(次のターン動けない)。"); }
        }
        break;
      }
      case "charge": s.foe.charged = true; say(`${o.name}は力をためている。`); break;
      case "heavy": if (s.foe.charged) { s.foe.charged = false; say(`${o.name}の大打撃!`); hurtMe(o.atk * BATTLE.heavyMult); } else { say(`${o.name}の攻撃。`); hurtMe(o.atk); } break;
    }
  };

  if (foeFirst) { foeAction(); if (s.me.hp > 0) myAction(); } else { myAction(); foeAction(); }
  if (s.foe.vines > 0 && s.foe.hp > 0) { s.foe.vines--; s.foe.hp = Math.max(0, s.foe.hp - 2); say("つる草が締めつけた(2)。"); }
  if (s.foe.weak > 0) s.foe.weak--;
  if (s.reveal > 0) s.reveal--;
  s.me.mp = Math.min(s.max.mp, s.me.mp + BATTLE.mpRegen);
  if (s.foe.hp <= 0) { s.over = "win"; say(`${o.name}に勝った!`); }
  else if (s.me.hp <= 0) { s.over = "lose"; say("膝をついた。今回はここまで。"); }
  else if (s.turn >= BATTLE.maxTurns) { s.over = "draw"; say("時間切れ。引き分け。"); }
  s.turn++;
  return s;
}

/** 記録したコマンドを最初から再生して結果を確かめる(保存の前にルールで決め直す) */
export function replay(c: Ctx, oppId: string, seed: number, cmds: Command[]) {
  let s = startBattle(c, oppId, seed);
  for (const cmd of cmds) { if (s.over) throw new Error("記録が正しくありません"); s = step(s, c, cmd); }
  return s;
}

/* ---------- 挑める相手・ランク・称号 ---------- */
export const unlocked = (defeated: string[], oppId: string) => {
  const i = OPPONENTS.findIndex((o) => o.id === oppId);
  if (oppId === "teacher") return OPPONENTS.slice(0, 5).every((o) => defeated.includes(o.id));
  return i === 0 || defeated.includes(OPPONENTS[i - 1].id);
};
export function rankOf(defeated: string[]) {
  if (defeated.includes("teacher")) return { id: "gold", name: "金の徽章" };
  if (OPPONENTS.slice(0, 5).every((o) => defeated.includes(o.id))) return { id: "silver", name: "銀の徽章" };
  if (defeated.length >= 3) return { id: "bronze", name: "銅の徽章" };
  return { id: "novice", name: "見習い" };
}
export const moveLabel = (m: FoeMove) => MOVE_TEXT[m].clear;
export const fxLabel = (id: string) => (SPELL_FX[id] ? FX_TEXT[SPELL_FX[id].kind] : "");

/* ---------- 結果をキャラクターに反映 ---------- */
import { addExp } from "../growth/engine";
import { materialById } from "./explore";
import type { StatHistory } from "../../schemas";
export function applyBattle(ch: Character, input: { id: string; opp: string; seed: number; cmds: Command[]; rewardedToday: number }, now: string, newId: () => string) {
  const o = opponentById(input.opp); if (!o) throw new Error("その相手はいません");
  if (!unlocked(ch.world.defeated, o.id)) throw new Error("まだ挑めない相手です");
  const s = replay(ctxOf(ch), o.id, input.seed, input.cmds);
  if (!s.over) throw new Error("戦闘が終わっていません");
  const history: StatHistory[] = []; const items: Record<string, number> = {};
  let c: Character = ch; let exp = 0; let rewarded = false;
  const titles: string[] = [];
  const addTitle = (name: string) => { if (!c.titles.some((t) => t.name === name)) { c = { ...c, titles: [...c.titles, { id: `t-${c.titles.length + 1}`, name, at: now }] }; titles.push(name); } };
  if (s.over === "win") {
    if (!c.world.defeated.length) addTitle(FIRST_WIN_TITLE);
    if (!c.world.defeated.includes(o.id)) c = { ...c, world: { ...c.world, defeated: [...c.world.defeated, o.id] } };
    if (o.title) addTitle(o.title);
    if (input.rewardedToday < BATTLE.rewardsPerDay) {
      rewarded = true; exp = o.exp;
      // 絆が高いと、素材が1つ増えることがある(戦闘の種から決まる)
      const n = 1 + (((input.seed * 7 + 3) % 100) / 100 < ch.basicStats.bond / 100 ? 1 : 0);
      items[o.reward] = n;
      const inv = c.inventory.find((i) => i.id === o.reward);
      c = { ...c, inventory: inv ? c.inventory.map((i) => (i.id === o.reward ? { ...i, qty: i.qty + n } : i)) : [...c.inventory, { id: o.reward, name: materialById(o.reward)?.name ?? o.reward, qty: n }] };
      c = addExp(c, exp, input.id, now, newId, history);
    }
  }
  return { character: { ...c, updatedAt: now }, history, state: s, exp, items, rewarded, titles };
}
