# ARCHITECTURE

## 構成
- React 18 + TypeScript + Vite / Tailwind CSS / Zustand(画面の状態)/ Dexie(IndexedDB)/ Zod(型と検証)/ Vitest + Playwright
- 3D(Three.js / React Three Fiber)は Phase 2 で追加
- 配信:GitHub Pages(.github/workflows/pages.yml)。HashRouter・相対パス(base "./")。public/sw.js でオフライン対応(ネット優先)

## 層
| 層 | 場所 | 役割 |
|---|---|---|
| 画面 | src/pages, src/components | 表示と入力だけ。保存は stores 経由 |
| 状態 | src/stores/game.ts | 読み込んだデータを持ち、保存処理のあとに読み直す |
| ルールエンジン | src/game/growth | 能力値・経験値・レベルの変化はすべてここ(純粋関数)。rules.ts が仮パラメータ |
| AI分析 | src/services/ai | AnalysisService の差し替え口。Phase 1 は端末内のルール分析。Phase 3 でAIを接続(APIキーは中継サーバーに置き、フロントに出さない) |
| 保存 | src/services/storage | Dexie のDBとリポジトリ。承認→反映はトランザクションで1回だけ |
| 型 | src/schemas | Zod スキーマ。保存・読み込み・AIの返り値はすべて検証する |

## 成長の流れ
1. 経験を登録(ExperienceEvent, analysisStatus=pending)
2. 分析サービスが proposedGrowth を作る(proposed)
3. プレイヤーが承認 → ルールエンジンが finalizeStats で確定 → キャラクターに反映、StatHistory に記録、approvedGrowth と appliedAt を保存(applied)
4. 同じ経験は appliedEventIds と analysisStatus の両方で二重反映を防ぐ。反映済みの経験は変更・削除できない(記録を消さない)
