import Dexie, { type Table } from "dexie";
import type { Character, ExperienceEvent, PlayerProfile, StatHistory } from "../../schemas";

export const SCHEMA_VERSION = 1;

export class ArcanaDB extends Dexie {
  player!: Table<PlayerProfile, string>;
  characters!: Table<Character, string>;
  experiences!: Table<ExperienceEvent, string>;
  statHistory!: Table<StatHistory, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor(name = "arcana-academy") {
    super(name);
    // データ構造を変えるときは version(2) を足して .upgrade() で移行する(既存データを消さない)
    this.version(1).stores({
      player: "id",
      characters: "id",
      experiences: "id, date, category, analysisStatus, createdAt",
      statHistory: "id, at, eventId, kind, key",
      meta: "key",
    });
  }
}

export let db = new ArcanaDB();
/** テスト用:別のDBに切り替える */
export function useDb(d: ArcanaDB) { db = d; }
