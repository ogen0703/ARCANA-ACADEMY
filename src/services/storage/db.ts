import Dexie, { type Table } from "dexie";
import type { Character, ExperienceEvent, PlayerProfile, StatHistory } from "../../schemas";

export const SCHEMA_VERSION = 2;

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
    // v2:経験に sourceRef(取り込み元の目印)を追加。既存データはそのまま(値なし)
    this.version(2).stores({ experiences: "id, date, category, analysisStatus, createdAt, sourceRef" }).upgrade(async (tx) => {
      await tx.table("meta").put({ key: "schemaVersion", value: 2 });
    });
  }
}

export let db = new ArcanaDB();
/** テスト用:別のDBに切り替える */
export function useDb(d: ArcanaDB) { db = d; }
