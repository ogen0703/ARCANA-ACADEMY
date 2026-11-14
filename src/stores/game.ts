import { create } from "zustand";
import type { Character, ExperienceEvent, PlayerProfile, StatHistory } from "../schemas";
import * as repo from "../services/storage/repo";
import { checkInbox, type InboxResult } from "../services/inbox";

type State = {
  ready: boolean; error: string | null;
  character: Character | null; player: PlayerProfile | null;
  experiences: ExperienceEvent[]; history: StatHistory[];
  load: () => Promise<void>;
  run: <T>(fn: () => Promise<T>) => Promise<T>;
  inbox: InboxResult | null; inboxBusy: boolean;
  pullInbox: () => Promise<InboxResult>;
};

export const useGame = create<State>((set, get) => ({
  ready: false, error: null, character: null, player: null, experiences: [], history: [],
  load: async () => {
    try {
      await repo.ensureInitialized();
      const [character, player, experiences, history] = await Promise.all([repo.getCharacter(), repo.getPlayer(), repo.listExperiences(), repo.listHistory()]);
      set({ ready: true, error: null, character, player, experiences, history });
    } catch (e) { set({ ready: true, error: e instanceof Error ? e.message : "読み込めませんでした" }); }
  },
  /** 保存処理を実行して、画面のデータを読み直す */
  run: async (fn) => { const r = await fn(); await get().load(); return r; },
  inbox: null, inboxBusy: false,
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
