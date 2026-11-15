import { create } from "zustand";
import type { BattleLog, TalkLog, Character, ExperienceEvent, ExploreLog, LessonLog, MagicKey, PlayerProfile, StatHistory } from "../schemas";
import { spellById } from "../game/academy/content";

/** 承認・レベルアップの演出(表示だけ。数値は rule engine が決める) */
export type Effect = { id: number; kind: "growth" | "level" | "spell"; spells?: string[]; title: string; stats: Record<string, number>; exp: number; levelFrom: number; levelTo: number };
import * as repo from "../services/storage/repo";
import { checkInbox, type InboxResult } from "../services/inbox";

type State = {
  ready: boolean; error: string | null;
  character: Character | null; player: PlayerProfile | null;
  experiences: ExperienceEvent[]; history: StatHistory[]; lessons: LessonLog[]; explorations: ExploreLog[]; battles: BattleLog[]; talks: TalkLog[];
  /** 授業を1コマ受ける。新しい呪文を覚えたら演出を出す */
  lesson: (course: MagicKey, unit: number, correct: boolean) => Promise<{ prof: number; exp: number; repeat: boolean; learned: string[] }>;
  load: () => Promise<void>;
  run: <T>(fn: () => Promise<T>) => Promise<T>;
  inbox: InboxResult | null; inboxBusy: boolean;
  pullInbox: () => Promise<InboxResult>;
  effect: Effect | null; burst: number;
  /** 承認して反映(複数なら古い順にまとめて)。演出を出す */
  approve: (ids: string[]) => Promise<number>;
  clearEffect: () => void;
};

export const useGame = create<State>((set, get) => ({
  ready: false, error: null, character: null, player: null, experiences: [], history: [], lessons: [], explorations: [], battles: [], talks: [],
  load: async () => {
    try {
      await repo.ensureInitialized();
      const [character, player, experiences, history, lessons, explorations, battles, talks] = await Promise.all([repo.getCharacter(), repo.getPlayer(), repo.listExperiences(), repo.listHistory(), repo.listLessons(), repo.listExplorations(), repo.listBattles(), repo.listTalks()]);
      set({ ready: true, error: null, character, player, experiences, history, lessons, explorations, battles, talks });
    } catch (e) { set({ ready: true, error: e instanceof Error ? e.message : "読み込めませんでした" }); }
  },
  /** 保存処理を実行して、画面のデータを読み直す */
  run: async (fn) => { const r = await fn(); await get().load(); return r; },
  inbox: null, inboxBusy: false,
  effect: null, burst: 0,
  approve: async (ids) => {
    const before = get().character;
    const stats: Record<string, number> = {}; let exp = 0, ok = 0, title = "";
    let firstErr: unknown = null;
    for (const id of ids) {
      try {
        await repo.approveExperience(id); ok++;
        const ev = await repo.getExperience(id);
        if (ev?.approvedGrowth) { title = ev.title; exp += ev.approvedGrowth.exp; for (const [k, v] of Object.entries(ev.approvedGrowth.stats)) stats[k] = Math.round(((stats[k] ?? 0) + v) * 10) / 10; }
      } catch (e) { firstErr ??= e; }
    }
    await get().load();
    const after = get().character;
    if (ok && before && after) {
      const lv = after.level > before.level;
      const newSpells = after.learnedSpells.filter((x) => !before.learnedSpells.includes(x)).map((x) => spellById(x)?.name ?? x);
      set({ burst: get().burst + 1, effect: { id: Date.now(), kind: lv ? "level" : "growth", spells: newSpells, title: ok > 1 ? `${ok}件の経験` : title, stats, exp, levelFrom: before.level, levelTo: after.level } });
    }
    if (!ok && firstErr) throw firstErr;
    return ok;
  },
  clearEffect: () => set({ effect: null }),
  lesson: async (course, unit, correct) => {
    const before = get().character;
    const r = await repo.takeLesson(course, unit, correct);
    await get().load();
    const after = get().character;
    const names = r.learned.map((s) => s.name);
    if (names.length || (before && after && after.level > before.level)) {
      set({ burst: get().burst + 1, effect: { id: Date.now(), kind: names.length ? "spell" : "level", spells: names, title: names.length ? `新しい呪文「${names.join("」「")}」` : "授業", stats: {}, exp: r.gain.exp, levelFrom: before?.level ?? 1, levelTo: after?.level ?? 1 } });
    }
    return { prof: r.gain.prof, exp: r.gain.exp, repeat: r.gain.repeat, learned: names };
  },
  /** 受け取り箱を確認して、届いた経験を「承認まち」に入れる */
  pullInbox: async () => {
    set({ inboxBusy: true });
    let r: InboxResult;
    try { r = await checkInbox(); } catch { r = { added: 0, skipped: 0, files: 0, error: "受け取り箱を確認できませんでした" }; }
    set({ inbox: r, inboxBusy: false });
    if (r.added) await get().load();
    return r;
  },
}));
