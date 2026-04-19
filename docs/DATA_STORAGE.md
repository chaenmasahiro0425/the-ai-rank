# 🗄 登録データの保管先について

## TL;DR

登録フォーム（氏名・メール・会社名・ランク等）から送信されたデータは、以下に保存されます：

1. **Supabase の `signups` テーブル**（永続・メイン保存先）
2. **Vercel Serverless Function のログ**（`console.log` — **PII をマスクした最小情報のみ**、7〜30日で自動削除）
3. **ユーザーのブラウザ**（`localStorage` — 再訪時のオートフィル用のみ）

セットアップ手順は [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)、テーブル定義は [`supabase/schema.sql`](../supabase/schema.sql) を参照。

---

## 📊 データの流れ

```
 [ User Browser ]
      │
      ├─ localStorage: 'airank:auth' (再訪時の autofill)
      │
      │  POST /api/signup
      ▼
[ Vercel Serverless Function ]
      │
      ├─ Origin / Referer / Rate limit / Honeypot
      │
      ├─ console.log('[AIRANK:signup]', {masked}) ──> [ Vercel Logs (7-30d) · PII はマスク済 ]
      │
      ├─ supabase.from('signups').insert(record) ────> [ Supabase Postgres ✅ ]
      │
      └─ (optional) fetch(SIGNUP_FORWARD_URL) ───────> [ Slack/Sheets/etc ]
```

- `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が未設定の場合、Supabase 書き込みはスキップされ警告ログのみ出る（フォーム自体は成功応答を返す）
- `hp`（ハニーポット）や異常値は自動で弾かれます

---

## 🔍 データの閲覧

### 一覧・検索・CSV出力
Supabase Dashboard → **Table Editor** → `signups`

### SQL集計
Supabase Dashboard → **SQL Editor**

```sql
-- 最新10件
select created_at, name, email, company, rank 
from signups order by created_at desc limit 10;

-- 日別登録数
select date_trunc('day', created_at) as day, count(*) 
from signups group by day order by day desc;

-- ランク分布
select rank, count(*) from signups group by rank order by rank;
```

### API 経由
`@supabase/supabase-js` で別アプリから読み取り可能（anon key + RLSポリシー設定要）

---

## 📋 保存カラム

| カラム | 型 | 内容 |
|---|---|---|
| `id` | uuid | 自動採番 |
| `created_at` | timestamptz | サーバー受信時刻 |
| `name` | text | 氏名（100文字以内） |
| `email` | text | メール（200文字以内、RFC+使い捨てドメインブロック） |
| `company` | text | 会社名（200文字以内・API層で必須）※DBスキーマ上は `null` 可だが `/api/signup` では必須バリデーション |
| `rank` | smallint \| null | 診断結果のランク（0〜9） |
| `client_at` | timestamptz \| null | クライアント時刻（参考値） |
| `url` | text | 登録時のページURL |
| `referrer` | text | 参照元URL |
| `user_agent` | text | User Agent（500文字以内） |
| `ip` | text | 送信元IP（X-Forwarded-For） |

---

## 🔐 セキュリティ（自動で有効）

現状の `api/signup.js` は以下をデフォルトで実施：

- ✅ **Origin チェック** — `ai-rank.org` / `the-ai-rank.vercel.app` / localhost からのみ受付
- ✅ **Referer チェック** — 別サイトからの POST をブロック
- ✅ **ハニーポット** — 隠しフィールド `hp` にボットが入力すると無言でスルー
- ✅ **IPレートリミット** — 同一IPから1分間に5回超えでブロック
- ✅ **メール厳密検証** — 正規表現 + 使い捨てメールドメインをブロック
- ✅ **最大文字数制限** — name 100 / email 200 / company 200
- ✅ **Row Level Security** — Supabase テーブルはRLS有効、クライアント直読み不可
- ✅ **service_role キー** — Vercel 環境変数のみに格納、フロント非公開
- ✅ **Cache-Control: no-store** — キャッシュ汚染防止
- ✅ **X-Robots-Tag: noindex** — 検索エンジンにクロールされない
- ✅ **ログ側の PII マスク** — Vercel Logs には `email_masked` / `email_domain` / `ip_present` 等のみ出力し、氏名・会社名・生のメール・User-Agent はログに残さない

---

## 📤 X（Twitter）シェア時のフロー

1. 診断完了 → 「SHARE TO X」クリック
2. 未登録なら → **登録モーダルが開く**
3. 氏名・メール・会社名を入力
4. 「登録して続ける」押下 → `completeAuth()`
   - 1. `POST /api/signup` → **Supabase に保存**（サーバー確定が最優先）
   - 2. localStorage に保存（再訪 autofill 用。サーバー成功後のみ）
   - 3. モーダル閉じる
5. X の投稿画面に `/c?rank=N&name=X` の URL が含まれる
6. X が URL を fetch → ランク別の認定証 OG 画像を表示

再訪時は登録済みなので、モーダルなしで直接シェアできます。

---

## 🛠 トラブルシュート

### データがSupabaseに来ない
1. Vercel Dashboard → Logs で `[AIRANK:signup]` を検索
2. `[AIRANK:supabase_not_configured]` が出ている → 環境変数未登録 → [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) step 4
3. `[AIRANK:supabase_insert_failed]` が出ている → テーブル未作成 or RLS問題 → SQL再実行
4. 何もログに出ていない → フロント側の問題。DevTools Network で `/api/signup` を確認

### 「Origin not allowed」 が返る
`api/signup.js` の `ALLOWED_ORIGINS` に本番ドメインを追加

### 「Too many requests」 が返る
同一IPから連投。60秒で解除。本番で緩めたい場合は `RATE_LIMIT_MAX` を調整

### Supabase を使わず外部転送のみにしたい
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を未設定にする
- `SIGNUP_FORWARD_URL` を設定 → その URL に JSON がPOSTされる（Google Sheets/Slack/Notion等）

---

## ❓ 質疑応答の戻るボタン

- ✅ 各質問カードの左上に「← 前の質問」ボタン（Q1は「氏名入力に戻る」）
- ✅ 結果画面に「質問に戻る」ボタン（最後の質問に戻れる）
- ✅ 「最初からやり直す」ボタン（診断をリセット）

---

最終更新: 2026-04-19
