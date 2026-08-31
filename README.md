# dicedungeon

ダイスで運命が決まるダンジョンローグライク

`index.html` をブラウザで開くだけで動く。ビルド手順はない。

開発を引き継ぐときは **[HANDOVER.md](HANDOVER.md)** を読む。
仕組み・データの置き場所・拡張のしかた・既知の不具合をまとめてある。

まだ作っていないものの構想は **[IDEAS.md](IDEAS.md)** に置いてある。

記録をクラウドに置いて端末をまたいで遊べるようにするには
**[FIREBASE.md](FIREBASE.md)** の手順に沿って設定する。設定しなくても遊べる。

> `serviceAccountKey.json`（`firebase-admin` の鍵）は**このリポジトリにもブラウザにも置かない**。
> 全データを無条件に読み書きできる鍵で、静的サイトに置けば誰でも使えてしまう。
> 詳しくは FIREBASE.md の冒頭。

```
node tools/probe.js          データの件数を一覧する
node tools/probe.js --check  データの参照が壊れていないか確かめる
node tools/bump.js           版（α0.0xxx）を1つ上げる。マージのたびに走らせる
node tools/balance.js        職業×種族16通りの強さを測る（--try で案を比べる）
```
