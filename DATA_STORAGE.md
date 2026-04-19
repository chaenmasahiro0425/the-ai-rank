# 🗄 登録データの保管先について

## TL;DR（現状）

登録フォーム（氏名・メール・会社名）から送信されたデータは、今は以下の2箇所だけに流れます：

1. **ユーザーのブラウザ**（`localStorage`）
2. **Vercel Serverless Function のログ**（`console.log`）

**つまり運営側にデータベースはまだありません。** Vercelログは検索はできますが、SQLクエリも不可、期限切れ（7〜30日）で消えます。

本格運用するには、下記の「永続DBに接続する」で `SIGNUP_FORWARD_URL` を設定してください。

---

## 📊 データの流れ（今）

```
 [ User Browser ]
      │
      ├─ localStorage: 'airank:auth' ─────────────┐
      │                                            │
      │  POST /api/signup                          │
      │                                            │
      ▼                                            │
[ Vercel Edge / Function ]                         │
      │                                            │
      ├─ Origin / Referer / Rate limit / Honeypot │
      │                                            │
      ├─ console.log('[AIRANK:signup]', record) ──┐
      │                                            │
      └─ (optional) fetch(SIGNUP_FORWARD_URL) ────┘
                                                   │
                                                   ▼
                                     [ Vercel Logs (7-30d) ]
```

ユーザーの `hp`（ハニーポット）や異常値は自動で弾かれます。

---

## 🔧 永続DBに接続する選択肢

`SIGNUP_FORWARD_URL` 環境変数に以下のいずれかのURLを入れるだけ：

### 推奨 ① **Google Sheets + Apps Script**（5分・無料）

1. Google Sheets で空のスプレッドシート作成
2. 「拡張機能」→「Apps Script」
3. 以下を貼って保存：

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(data.at || Date.now()),
    data.name || "",
    data.email || "",
    data.company || "",
    data.rank || "",
    data.referrer || "",
    data.url || "",
    data.ip || "",
    data.ua || "",
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. 「デプロイ」→「ウェブアプリとしてデプロイ」
5. アクセス権: 「全員」
6. デプロイ後のURL（`.../exec`）をコピー
7. Vercel Dashboard → Settings → Environment Variables に `SIGNUP_FORWARD_URL` を追加
8. 再デプロイ

これで登録のたびにスプレッドシートに1行ずつ追加されます。

### 推奨 ② **Slack Webhook**（30秒・無料）

リアルタイム通知が欲しい場合：

1. Slack で Incoming Webhook を作成
2. URL を `SIGNUP_FORWARD_URL` に設定
3. ただし Slack の JSON 形式に合わせて api/signup.js 側を調整する必要あり

### 推奨 ③ **Vercel Postgres / KV**（本格的）

- `vercel storage create` で Postgres / KV DB を作成
- `api/signup.js` を書き換えて `@vercel/postgres` or `@vercel/kv` から書き込み
- 本格運用・分析するならこれ

### 推奨 ④ **Notion API**

1. Notion DB 作成（name, email, company, rank 列）
2. Notion インテグレーション作成、API key取得
3. 中間 Apps Script or Vercel function で Notion API を叩く
4. そのURLを `SIGNUP_FORWARD_URL` に

### 推奨 ⑤ **Airtable / Formspree**

- **Formspree**: 最速。無料プランで月50件。直接 URL 設定すれば OK
- **Airtable**: Webhook は別途 Zapier / Make 経由が必要

---

## 🔐 セキュリティ（自動で有効）

現状の `api/signup.js` は以下をデフォルトで実施：

- ✅ **Origin チェック** — `ai-rank.org` / `the-ai-rank.vercel.app` / localhost からのみ受付
- ✅ **Referer チェック** — 別サイトからの POST をブロック
- ✅ **ハニーポット** — 隠しフィールド `hp` にボットが入力すると無言でスルー
- ✅ **IPレートリミット** — 同一IPから1分間に5回超えでブロック（in-memory、serverless instance 単位）
- ✅ **メール厳密検証** — RFC ライクな正規表現 + 使い捨てメールドメインをブロック
- ✅ **最大文字数制限** — name 100 / email 200 / company 200
- ✅ **Cache-Control: no-store** — キャッシュ汚染防止
- ✅ **X-Robots-Tag: noindex** — 検索エンジンにクロールされない

---

## 📤 X（Twitter）シェア時のフロー

1. 診断完了 → 「SHARE TO X」クリック
2. 未登録なら → **登録モーダルが開く**
3. 氏名・メール・会社名を入力（hp は空のまま）
4. 「登録して続ける」押下 → `completeAuth()` 実行
   - 1. localStorage に保存（再訪時の autofill 用）
   - 2. `POST /api/signup` — サーバーへ（失敗しても無言）
   - 3. モーダル閉じる
5. X の投稿画面が開き、**`/c?rank=N&name=X` の URL** が含まれる
6. X が URL を fetch → **ランク別の認定証 OG 画像** を表示

再訪時は登録済みなので、モーダルなしで直接シェアできます。

---

## 🛠 トラブルシュート

### データが来ない / ログに出ない

1. Vercel Dashboard → プロジェクト → Logs で `[AIRANK:signup]` を検索
2. 出ていればサーバーは受信済み → 外部転送側の問題
3. 出ていなければフロントのフォーム送信に失敗 → ブラウザの DevTools Network で `/api/signup` を確認

### 「Origin not allowed」 が返る

`ALLOWED_ORIGINS` に本番ドメインを追加してください（`api/signup.js` 内）。

### 「Too many requests」 が返る

同一IPから連投した可能性。60秒待てば戻ります（デモ・開発用途）。
本番で緩めたい場合は `RATE_LIMIT_MAX` を調整してください。

---

## ❓ 質疑応答の戻るボタン

- ✅ 各質問カードの左上に「← 前の質問」ボタン（Q1は「氏名入力に戻る」）
- ✅ 結果画面に「質問に戻る」ボタン（最後の質問に戻れる）
- ✅ 「最初からやり直す」ボタン（診断をリセット）

---

最終更新: 2026-04-19
