# dicedungeon

ダイスで運命が決まるダンジョンローグライク

`index.html` をブラウザで開くだけで動く。ビルド手順はない。

開発を引き継ぐときは **[HANDOVER.md](HANDOVER.md)** を読む。
仕組み・データの置き場所・拡張のしかた・既知の不具合をまとめてある。

まだ作っていないものの構想は **[IDEAS.md](IDEAS.md)** に置いてある。

```
node tools/probe.js          データの件数を一覧する
node tools/probe.js --check  データの参照が壊れていないか確かめる
node tools/bump.js           版（α0.0xxx）を1つ上げる。マージのたびに走らせる
```
