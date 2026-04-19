# 🗄 Supabase セットアップガイド

登録データ（氏名・メール・会社・ランク等）を Supabase の `signups` テーブルに保存します。所要 **約10分**。

---

## 1. Supabase プロジェクト作成

1. https://supabase.com/ → **Start your project** → GitHubでサインイン
2. **New project**
   - Organization: お好み
   - Name: `the-ai-rank`
   - Database Password: **安全なものを生成**（パスマネに保存）
   - Region: `Northeast Asia (Tokyo)` 推奨（日本ユーザーが多いため）
3. 作成完了まで 1〜2分待つ

---

## 2. テーブル作成（SQLエディタ）

1. 左サイドバー → **SQL Editor** → **New query**
2. このリポジトリの [`SUPABASE_SCHEMA.sql`](./SUPABASE_SCHEMA.sql) の中身を丸ごと貼り付け
3. 右下 **Run** をクリック
4. エラーが出なければOK

動作確認：

```sql
select count(*) from public.signups;
-- => 0
```

---

## 3. APIキーを取得

1. 左サイドバー → **Project Settings** → **API**
2. 以下2つをコピー：

| 名前 | Supabase上のラベル | 用途 |
|---|---|---|
| `SUPABASE_URL` | **Project URL** (`https://xxxx.supabase.co`) | 接続先 |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key（⚠️ secret） | サーバー用（RLS無視） |

> ⚠️ `service_role` キーは**絶対にフロントエンドに露出させない**。サーバー関数 (`/api/signup.js`) からのみ使用。

---

## 4. Vercel 環境変数に登録

1. Vercel Dashboard → `the-ai-rank` プロジェクト → **Settings** → **Environment Variables**
2. 以下2つを追加（すべての環境：Production / Preview / Development にチェック）：

```
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service_role key>
```

3. **Save**

---

## 5. 再デプロイ

Vercel Dashboard → **Deployments** → 最新の `...` メニュー → **Redeploy**

もしくは次の Git push で自動デプロイ。

---

## 6. 動作確認

1. 本番サイトで診断開始 → 登録モーダルに入力 → 送信
2. Supabase Dashboard → **Table Editor** → `signups` テーブルに行が追加されていればOK
3. Vercel の Function Logs で `[AIRANK:signup]` が出ていて、**エラーログが出ていない**ことを確認

### エラー時のチェックポイント

- `[AIRANK:supabase_not_configured]` → 環境変数が空。Vercel 側の Settings を再確認し、再デプロイ
- `[AIRANK:supabase_insert_failed]` → テーブル未作成 or RLS ブロック。SQL再実行
- `permission denied for table signups` → `service_role` ではなく `anon` キーを入れている。key取り違え

---

## 7. データの見方

### ダッシュボードで見る
Supabase → **Table Editor** → `signups`
- 全件一覧、フィルタ、検索、並び替え、CSV出力が可能

### SQLで集計する
Supabase → **SQL Editor**

```sql
-- 日別の登録数
select date_trunc('day', created_at) as day, count(*) 
from signups 
group by day 
order by day desc;

-- ランク分布
select rank, count(*) 
from signups 
where rank is not null 
group by rank 
order by rank;

-- 同一メアドの重複
select email, count(*) 
from signups 
group by email 
having count(*) > 1;

-- 最新の10件
select created_at, name, email, company, rank 
from signups 
order by created_at desc 
limit 10;
```

---

## 8. バックアップ・移行

### CSVエクスポート
Table Editor → 右上 **...** → **Export as CSV**

### 別プロジェクトに移す
`pg_dump` で標準のPostgresダンプが取れる。ベンダーロックインなし。

---

## セキュリティ補足

- ✅ **Row Level Security (RLS)** が有効。クライアントからの直接読み取りは不可
- ✅ サーバー関数からは `service_role` キーで書き込み（RLSバイパス）
- ✅ `SUPABASE_SERVICE_ROLE_KEY` は Vercel 環境変数に暗号化保管
- ✅ 個人情報（氏名・メール）を扱うため、プライバシーポリシーの整備推奨

---

## トラブルシュート

### 「なぜか保存されない」
1. Vercel Logs で `[AIRANK:signup]` を検索 → ログは出ているか？
   - 出ていない → フロント→`/api/signup` が失敗。DevTools Network を確認
   - 出ている → 次へ
2. `[AIRANK:supabase_*]` 系ログを検索
   - `not_configured` → 環境変数未登録。step 4 へ
   - `insert_failed` → SQL スキーマを再適用。step 2 へ
3. Supabase Table Editor で手動insertしてみて、そもそも書けるか確認

### 「service_role キーをうっかりコミットした」
1. **即座に Supabase Dashboard → Settings → API → Reset service_role key**
2. Vercel の環境変数を新しいキーで上書き
3. Git 履歴から削除（`git filter-repo` 等）

---

最終更新: 2026-04-19
