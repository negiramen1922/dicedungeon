# Firebase の設定

記録（図鑑・殿堂・到達階層・読んだお知らせ）を**クラウドに置き、端末をまたいで続き**を
遊べるようにするための手順。ここに書いてある通りにやれば動く。

まだ設定していなくてもゲームは動く。そのときは今までどおり端末内（localStorage）だけに残る。

---

## いまの状態（2026-08-31）

プロジェクト **`dicedungeon-a3d1e`** の `firebaseConfig` は `index.html` に入れてある。
**あとはコンソール側の4つだけ。**

- [ ] **1-1** Firestore を作る（本番環境モード・`asia-northeast1`）
- [ ] **1-2** Authentication で **匿名** と **Google** を有効にする
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

**Authentication → 設定 → 承認済みドメイン**

`localhost` は最初から入っている。GitHub Pages などで配るなら、
その**ドメイン**（例 `negiramen1922.github.io`）を足す。
足し忘れると Google ログインだけが `auth/unauthorized-domain` で失敗する。

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

```
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc     # 中身はもう dicedungeon-a3d1e になっている
firebase deploy --only firestore:rules
```

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
users/{uid}
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

## 8. Analytics を足したくなったら

コンソールが出す雛形には `getAnalytics` が入っているが、**いまは読み込んでいない**。
`measurementId` だけ `FIREBASE_CONFIG` に控えてある。

要るようになったら `Cloud` の `load()` に
`import(base+"firebase-analytics.js")` を足して `getAnalytics(app)` を呼ぶ。
ただし**遊びに要るものではない**うえ、地域によっては同意の取得が要る。
入れるなら「何を測って何に使うか」を決めてからにする。
