# Firebase の設定

記録（図鑑・殿堂・到達階層・読んだお知らせ）を**クラウドに置き、端末をまたいで続き**を
遊べるようにするための手順。ここに書いてある通りにやれば動く。

まだ設定していなくてもゲームは動く。そのときは今までどおり端末内（localStorage）だけに残る。

---

## いまの状態（2026-08-31）

プロジェクト **`dicedungeon-a3d1e`** の `firebaseConfig` は `index.html` に入れてある。
**あとはコンソール側の4つだけ。**

- [x] **1-1** Firestore ―― **もうある**（作ろうとして
      `Database already exists` が出るのは「既定のデータベースが既にある」という意味）
- [x] **1-2** Authentication で **匿名** と **Google** を有効にする
- [ ] **1-4** 承認済みドメインに、配る場所を足す（`localhost` は最初から入っている）
- [ ] **3** `firebase deploy --only firestore:rules` でルールを配る

**4つ目を忘れると、本番環境モードは書き込みを全部拒否する。**
歯車の中に「書き込みを断られた」と出たらこれ。

済んだら **5. 動いているか確かめる** へ。

---

## 0. 先に読む ―― サービスアカウントキーの話

`firebase-admin` と `serviceAccountKey.json` を使う書き方が世の中にはあるが、
**このゲームでは絶対に使わない。**

```js
// ← これはサーバー専用。ブラウザに置いてはいけない
var admin = require("firebase-admin");
var serviceAccount = require("path/to/serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
```

`serviceAccountKey.json` は**全データを無条件に読み書きできる鍵**で、
セキュリティルールを一切通らない。このゲームは `index.html` 1枚の静的サイトなので、
そこに書けば**ソースを開いた誰でも全ユーザーの記録を読めて、消せる**。
リポジトリに push した時点でも漏洩として扱われる。

ブラウザ側で使うのは **Firebase Web SDK**（`firebase-app` / `firebase-auth` / `firebase-firestore`）。
`index.html` に貼る `firebaseConfig` の `apiKey` は**公開前提の識別子**で、秘密ではない。
守っているのは `firestore.rules` のほう。

Admin SDK が要るのは、あとでサーバー側の処理（Cloud Functions での
ランキング検証など）を足すときだけ。そのときも鍵はサーバーに置き、
リポジトリには入れない（`.gitignore` で弾いてある）。

---

## 1. Firebase コンソールでやること

<https://console.firebase.google.com/>

### 1-1. Firestore を作る

**構築 → Firestore Database → データベースの作成**

- モード … **本番環境モード**（ルールはこのあと配る）
- ロケーション … `asia-northeast1`（東京）

> **`Database already exists. Please use another database_id` と出たら**
> それは失敗ではない。**既定のデータベースがもうある**という意味なので、この手順は済んでいる。
> <https://console.firebase.google.com/project/dicedungeon-a3d1e/firestore> を開いて、
> データを一覧する画面が出れば大丈夫。
>
> ただし画面に **「Datastore モード」** と書いてあったら、それは別物で
> Web SDK からは使えない。その場合だけ作り直しが要る。

### 1-2. ログインの方式を有効にする

**構築 → Authentication → 始める → Sign-in method**

次の2つを「有効」にする。

| 方式 | 何のため |
|---|---|
| **匿名** | 起動した瞬間から、ログイン操作なしで記録が残る |
| **Google** | あとから連携して、別の端末に持ち出せるようにする |

### 1-3. ウェブアプリを登録して、設定値をもらう

**プロジェクトの設定（歯車）→ マイアプリ → ウェブアプリを追加（`</>`）**

登録すると `firebaseConfig` が出る。これを次の手順で貼る。

### 1-4. 承認済みドメインに、配る場所を足す

**Authentication → 「設定」タブ → 承認済みドメイン → ドメインを追加**

直リンク … <https://console.firebase.google.com/project/dicedungeon-a3d1e/authentication/settings>

（Authentication の画面のいちばん上、「ユーザー / Sign-in method / テンプレート / 使用状況 / **設定**」
という並びの右のほう。Sign-in method と同じ階層にある）

`localhost` は最初から入っている。GitHub Pages などで配るなら、
その**ドメイン**（例 `negiramen1922.github.io`）を足す。
足し忘れても匿名の保存は動くが、**Google ログインだけ** `auth/unauthorized-domain` で失敗する。

---

## 2. `index.html` に設定値を貼る　― 済

`index.html` の `FIREBASE_CONFIG` に `dicedungeon-a3d1e` の値が入っている。
プロジェクトを作り直したときはここを差し替える。

**空にすれば、クラウド保存の仕組みはまるごと眠る**（ゲームは端末内だけに記録を残す）。

読み込む SDK の版は同じところの `FBVER` で決めている。上げたいときはここだけ直す。

### apiKey がリポジトリに入っていることについて

これは仕様どおりで、問題ない。ウェブの `apiKey` は**どのプロジェクトかを示す識別子**で、
パスワードではない。Firebase の公式もクライアントに埋めることを前提にしている。
**守っているのは `firestore.rules`**（→ 3.）。

気になるならもう一段だけ足せる。Google Cloud コンソールの
**APIとサービス → 認証情報 → Browser key** で、
**アプリケーションの制限 → HTTP リファラー**に配るドメインを入れておくと、
他所のサイトから同じ鍵を使い回されにくくなる。
（ただしこれは行儀の悪い利用を減らすだけで、防壁はあくまでルールのほう）

**逆に `serviceAccountKey.json` は一切ちがう。** あれは本物の鍵で、
ルールを通らない。リポジトリにもブラウザにも置かない（0. を読む）。

---

## 3. ルールを配る

**ここを飛ばすと、本番環境モードでは書き込みが全部拒否される。**

### やりかた A ―― コンソールに貼る（かんたん。何も入れなくていい）

1. <https://console.firebase.google.com/project/dicedungeon-a3d1e/firestore/rules> を開く
2. エディタの中身を**全部消す**
3. このリポジトリの **`firestore.rules` の中身をそのまま貼る**
4. **「公開」** を押す

貼ったあとエディタが赤い波線を出さなければ、書式は通っている。

### やりかた B ―― CLI から配る（手元から何度も直すならこちら）

```
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc     # 中身はもう dicedungeon-a3d1e になっている
firebase deploy --only firestore:rules
```

**A と B のどちらでもよいが、混ぜないこと。** コンソールで直した内容は、
次に B を走らせた瞬間にリポジトリの中身で上書きされる。
コンソールで直したら、同じ内容を `firestore.rules` にも書き戻しておく。

`firestore.rules` が決めているのは3つ。

- 自分の `users/{uid}` だけ読み書きできる
- 一覧（list）は誰にも許さない（uid を総なめされないため）
- 形が違うもの、殿堂が 50 件を超えるものは受け取らない

---

## 4. 配る（任意）

Firebase Hosting を使うなら。

```
firebase deploy --only hosting
```

GitHub Pages のままでもよい。その場合は 1-4 のドメイン追加を忘れないこと。

**どちらにしても `http(s)` で配ること。** `file://` で直接開くと SDK を読み込めず、
クラウド保存だけが黙って無効になる（ゲーム自体は動く）。

---

## 5. 動いているか確かめる

1. 歯車 ⚙ を開く
2. いちばん下に **「クラウドに保存中」** と出ていれば成功
3. 「Google と連携する」を押して、別のブラウザで開き直す →
   図鑑と殿堂が付いてきていれば通し

コンソールの **Firestore → データ** に `users/{uid}` が1件できているはず。

---

## 6. うまくいかないとき

歯車の中にそのままエラーが出る。よくあるもの。

| 出るもの | 原因 | 直しかた |
|---|---|---|
| 書き込みを断られた | ルールを配っていない | `firebase deploy --only firestore:rules` |
| この場所からのログインが許されていない | 承認済みドメイン | 1-4 にドメインを足す |
| その入り方が有効になっていない | 匿名 / Google が無効 | 1-2 で有効にする |
| SDK を読み込めなかった | `file://` で開いた・版が違う | http(s) で配る／`FBVER` を直す |
| Firestore がまだ作られていない | 1-1 をやっていない | データベースを作る |
| SDK を読み込めなかった（版 12.18.0） | CDN に届いていない | つながりを確かめる。社内網などで `gstatic.com` が塞がれていることもある |

---

## 7. どう保存しているか

```
games/dicedungeon/players/{uid}
  v    : 記録の形の版（index.html の MVER）
  meta : { codex, rooms, elem, mats, seen, hall, runs, best, tutSeen, newsSeen }
  at   : サーバー時刻
```

**端末内が主、クラウドはその写し。** 通信が死んでいてもゲームは止まらない。

書き込みは 8 秒ぶんまとめてから送る。1周の終わりと、画面を閉じる直前は必ず送る。

サインインしたときは**取ってきたものと端末内のものを統合**する。
どちらかを捨てるのではなく、

- 数（潜った回数・最高階層・図鑑の戦数）… **大きいほう**
- 印（見たもの・素材・弱点）… **付いているほう**
- 殿堂 … **両方を混ぜて**、時刻で並べ、新しい 50 件

2台で別々に遊んでいても、どちらの記録も消えないようにしてある。

---

## 8. 他のゲームと同じプロジェクトを使いたいとき

**できる。**ログインが1つで済むので、同じ人が同じ uid で両方遊べるという利点もある。
気をつけるのは2つだけ。

### ぶつからないように、置き場所に名前を付けてある

```
games/dicedungeon/players/{uid}
```

`users/{uid}` のような一等地には置いていないので、
別のゲームが `users/…` や `games/ほかのゲーム/…` を使っていても当たらない。
場所を変えたいときは `index.html` の `CPATH` を直す（ルールのパスも揃えること）。

### ルールは「丸ごと差し替え」なので、貼り足して配る

`firestore.rules` はプロジェクトに1つしか置けない。
`firebase deploy --only firestore:rules` は**中身を丸ごと入れ替える**ので、
このリポジトリの `firestore.rules` をそのまま配ると
**相手のゲームのルールが消えて、相手が動かなくなる。**

相乗りさせるなら、

1. `firestore.rules` の
   `===== ここから ダイスダンジョン =====` から `===== ここまで =====` までを、
   **相手のルールファイルに貼り足す**
2. いちばん下の **「ほかは全部だめ」の4行は持っていかない**
   （相手のゲームのパスまで塞いでしまう）
3. 配るのは、相手のリポジトリの側から一度だけ

`.firebaserc` のプロジェクトIDも、相乗り先のものに合わせる。

### どちらにするか

| | 分ける（いまの `dicedungeon-a3d1e`） | 相乗りさせる |
|---|---|---|
| ルールの配布 | このリポジトリから普通に配れる | 貼り足して、片方からだけ配る |
| 事故ったとき | このゲームだけで済む | 両方止まる |
| ログイン | ゲームごとに別の uid | 同じ人が同じ uid |
| 無料枠 | それぞれに付く | 分け合う |

**もう `dicedungeon-a3d1e` は出来上がっているので、分けたままが楽。**
「アカウントを1つにまとめたい」という気持ちが出てきたら、そのとき移せばいい
（`index.html` の `FIREBASE_CONFIG` を差し替えるだけ。記録は移らないので、
移すなら殿堂と図鑑を諦めるか、手で運ぶことになる）。

---

## 9. Analytics を足したくなったら

コンソールが出す雛形には `getAnalytics` が入っているが、**いまは読み込んでいない**。
`measurementId` だけ `FIREBASE_CONFIG` に控えてある。

要るようになったら `Cloud` の `load()` に
`import(base+"firebase-analytics.js")` を足して `getAnalytics(app)` を呼ぶ。
ただし**遊びに要るものではない**うえ、地域によっては同意の取得が要る。
入れるなら「何を測って何に使うか」を決めてからにする。
