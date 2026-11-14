# DATA_SCHEMA(schemaVersion 2)

IndexedDB「arcana-academy」。定義は src/schemas/index.ts(Zod)と src/services/storage/db.ts。

| テーブル | キー | 中身 |
|---|---|---|
| player | id="player" | 現実のプレイヤー情報(呼び名・性別・誕生日・写真利用の同意・外部AI送信の同意)。キャラクターとは分離 |
| characters | id="hero" | name, level, experience, appearance, basicStats(7能力 0〜100), personality(10項目:value=null/evidence), magicAffinity(6系統:value=null/signals), learnedSpells, inventory, titles, achievements, relationships, history(出身・寮・杖・年齢), appliedEventIds |
| experiences | id | ExperienceEvent:date, source, category, title, description, difficulty(1〜5), duration(分), reflection, analysisStatus(pending/proposed/applied/rejected), proposedGrowth, approvedGrowth, createdAt, appliedAt, sourceRef(v2・取り込み元の目印) |
| statHistory | id | 変化の履歴:at, eventId, kind(stat/exp/level), key, before, after |
| meta | key | schemaVersion など |

Growth = { exp, stats(能力ごとの増分), personalitySignals, magicSignals, notes, engine }

## マイグレーション
- 構造を変えるときは db.ts に version(n+1).stores(...).upgrade(...) を足し、SCHEMA_VERSION を上げる。既存データは消さない
- エクスポートJSON(app="arcana-academy", schemaVersion, player, character, experiences, statHistory)。新しいバージョンのファイルは古いアプリでは読み込まない

## 取り込みファイル(経験)
{ app: "arcana-academy-experiences", source: "markdown"|"csv"|"diary"|"ai", note?, items: [{ date, category, title, description, difficulty, duration, reflection, sourceRef?, ai? }] }

## v3(Phase 3)
- キャラクター:personality[k] に weight(兆しの強さの合計)、magicAffinity[k] に base(入学診断の出発点、未診断は null)、diagnosedAt を追加。移行時に反映済みの経験から weight を数え直す(既存の値は消さない)
- 経験:ai?(AIの読み取り){ by, at, summary, personality: {キー:0〜1}, magic: {キー:0〜1}, reasons[] }。確定データ(approvedGrowth)とは別に持つ
- meta:report:<期間ID>(成長レポートの講評。w:YYYY-MM-DD / m:YYYY-MM)
