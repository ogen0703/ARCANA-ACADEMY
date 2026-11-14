# ARCANA ACADEMY

現実の経験で育つ、あなただけの魔法使い。—「あなたが生きた時間が、その魔法使いの歴史になる。」

- 仕様:[docs/GDD.md](docs/GDD.md) / 構成:[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) / データ:[docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)
- `npm install` → `npm run dev`(開発)/ `npm test`(ルール・保存のテスト)/ `npm run build`
- `NODE_PATH=$(npm root -g) npm run e2e`(Playwrightで画面の通しテスト。Playwrightが入った環境で)
- データはすべて端末内(IndexedDB)に保存され、外部には送りません
