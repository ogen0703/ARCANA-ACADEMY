Claude Code 開発指示書

ARCANA ACADEMY v1.0

あなたは本プロジェクトのテクニカルリード兼フルスタックゲーム開発者です。

以下の仕様に従って、ARCANA ACADEMYを開発してください。

1. 最重要開発ルール

* GDDをマスター仕様として扱う。
* 独断で世界観・キャラクター設定・成長ルールを変更しない。
* 既存の機能を破壊しない。
* 既存コードを確認してから変更する。
* 機能追加後は必ず動作確認する。
* エラーを放置しない。
* データ構造の変更時はマイグレーションを用意する。
* ゲーム内の能力値は必ずルールエンジン経由で変更する。
* AIの分析結果と確定したゲームデータを区別する。
* 外部APIのキーをフロントエンドに露出させない。
* すべての重要なゲームデータを永続保存する。

2. 技術構成

まず以下を採用候補として検証する。

* React
* TypeScript
* Vite
* Tailwind CSS
* Three.js / React Three Fiber
* Zustand
* IndexedDB（Dexie等）
* Zod
* Vitest
* Playwright

3D表示にはThree.jsを使用する。

AI機能は独立したサービス層として設計する。

将来的にClaude API等を接続できる構造にする。

初期段階では外部AI APIを必須にしない。

3. 開発前の調査

開発開始前に以下を実施する。

1. 現在の作業ディレクトリを確認。
2. 既存ファイルを確認。
3. Gitの状態を確認。
4. package.jsonを確認。
5. 開発環境・依存関係を確認。
6. 既存プロジェクトがある場合は構成を維持。
7. 新規プロジェクトの場合のみ初期構成を作成。

既存データや設定を無断で削除しない。

4. 推奨ディレクトリ構成

src/
app/
components/
pages/
Home/
Character/
Magic/
Academy/
Exploration/
Experience/
Encyclopedia/
Story/
game/
character/
growth/
magic/
quests/
battle/
world/
creatures/
services/
ai/
import/
storage/
stores/
schemas/
hooks/
assets/
models/
textures/
environments/
effects/
styles/
utils/

docs/
GDD.md
ARCHITECTURE.md
DATA_SCHEMA.md
CHANGELOG.md
DEVELOPMENT_LOG.md

5. キャラクターデータ構造

以下を基本とする。

Character:

* id
* name
* createdAt
* updatedAt
* level
* experience
* appearance
* basicStats
* personality
* magicAffinity
* learnedSpells
* inventory
* titles
* achievements
* relationships
* history

すべてのデータに型定義とバリデーションを用意する。

6. 成長システム

経験イベントを以下の構造で保存する。

ExperienceEvent:

* id
* date
* source
* category
* title
* description
* difficulty
* duration
* reflection
* analysisStatus
* proposedGrowth
* approvedGrowth
* createdAt

AIはproposedGrowthを生成する。

プレイヤーの確認後にapprovedGrowthを確定する。

確定した成長データは重複適用できないようにする。

能力値の変化は履歴として記録する。

7. AI分析システム

AI分析サービスは以下を担当する。

* 経験内容の分類
* 成長候補の提案
* 性格傾向の分析
* 魔法適性の分析
* 過去の経験との関連付け
* 成長レポートの生成

分析結果は必ず構造化データとして取得する。

不確実な情報は推測で補完せず、unknownとして扱う。

性格分析は複数の経験を考慮する。

1回の行動だけで性格を決定しない。

8. 画面開発

最初に以下の画面を作成する。

HOME：

* 魔法学院のメインビジュアル
* 主人公の3D表示
* 名前
* レベル
* 経験値
* 最新の成長情報
* 各機能へのナビゲーション

CHARACTER：

* キャラクターモデル
* 基本ステータス
* 性格
* 魔法適性
* 成長履歴

EXPERIENCE：

* 経験登録フォーム
* 登録済み経験一覧
* AI分析候補
* 成長適用確認

MAGIC：

* 魔法系統
* 習得魔法
* 未習得魔法
* 魔法適性

9. ビジュアル品質

デザイン方針：

* 写実的な3Dファンタジー
* ダークアカデミア
* ゴシック建築
* 紫・藍色・金色を基調
* 暖色のランタンやキャンドル
* 魔法陣や粒子エフェクト
* 上品で重厚なUI
* 過剰な装飾を避ける

ゲームとしての没入感を優先する。

スマートフォンでも操作しやすいレスポンシブ設計にする。

3D素材がない場合は仮素材を使用し、将来的な差し替えを可能にする。

10. データ永続化

初期段階はIndexedDBを採用。

以下を永続保存する。

* 主人公
* 能力値
* 性格
* 経験イベント
* 魔法
* アイテム
* クエスト
* ストーリー進行
* 成長履歴

JSON形式でエクスポート・インポートできるようにする。

11. セキュリティ

* APIキーをソースコードに直書きしない。
* 個人情報を無断送信しない。
* 外部APIへの送信内容を制御する。
* AIへの入力データを最小限にする。
* データ削除とバックアップ機能を設ける。

12. 開発フェーズ

Phase 1：
基礎UI、キャラクター、ステータス、経験登録、成長処理、保存。

Phase 2：
3Dキャラクター表示、学院ホーム、世界観演出。

Phase 3：
AI分析、性格形成、魔法適性。

Phase 4：
授業、探索、クエスト、戦闘。

Phase 5：
魔法生物、進化、ストーリー分岐。

13. 完成条件

各フェーズで以下を確認する。

* 起動できる。
* エラーが発生しない。
* データが正しく保存される。
* 再起動後もデータが保持される。
* 画面遷移が正常。
* スマートフォンでも操作できる。
* 既存機能が壊れていない。
* テストが通る。

14. 最初の作業指示

まずは既存環境を調査してください。

調査後、実装方針を提示してください。

その後、Phase 1の実装に着手してください。

一度にすべてを実装せず、動作確認をしながら段階的に進めてください。

各フェーズ完了時には以下を報告してください。

1. 実装した機能
2. 変更したファイル
3. 動作確認結果
4. 発生した問題
5. 次の開発予定

本プロジェクトの最優先事項は、長期的にデータが蓄積され、主人公が実際に成長していくゲーム基盤を完成させることです。