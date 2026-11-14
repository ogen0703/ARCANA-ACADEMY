import Dexie, { type Table } from "dexie";
import type { Character, ExperienceEvent, LessonLog, PlayerProfile, StatHistory } from "../../schemas";
import { houseFor } from "../../game/academy/content";
import { migrateCharacterV3 } from "./migrations";

export const SCHEMA_VERSION = 4;

export class ArcanaDB extends Dexie {
  player!: Table<PlayerProfile, string>;
  characters!: Table<Character, string>;
  experiences!: Table<ExperienceEvent, string>;
  statHistory!: Table<StatHistory, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  lessonLog!: Table<LessonLog, string>;
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
    // v3(Phase 3):性格に weight、魔法適性に base、キャラクターに diagnosedAt。反映済みの経験から兆しの強さを数え直す
    this.version(3).stores({}).upgrade(async (tx) => {
      const evs = (await tx.table("experiences").toArray()) as ExperienceEvent[];
      await tx.table("characters").toCollection().modify((c: Character) => { Object.assign(c, migrateCharacterV3(c, evs)); });
      await tx.table("meta").put({ key: "schemaVersion", value: 3 });
    });
    // v4(Phase 4a):授業の記録。入学診断を受け済みなら寮を決める
    this.version(4).stores({ lessonLog: "id, at, date, course" }).upgrade(async (tx) => {
      await tx.table("characters").toCollection().modify((c: Character) => {
        if (c.diagnosedAt && !c.history?.house) c.history = { ...c.history, house: houseFor(Object.fromEntries(Object.entries(c.magicAffinity).map(([k, v]) => [k, v.base]))).name };
      });
      await tx.table("meta").put({ key: "schemaVersion", value: 4 });
    });
  }
}

export let db = new ArcanaDB();
/** テスト用:別のDBに切り替える */
export function useDb(d: ArcanaDB) { db = d; }
