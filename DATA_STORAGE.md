# 🗄 登録データの保管先について

## 現状（2026-04-19 時点）

登録されたデータ（氏名・メール・会社名）は、**現在はユーザーのブラウザの localStorage のみ** に保存されています。

```js
// script.js 内
localStorage.setItem("airank:auth", JSON.stringify({
  name, email, company, at: 1681900000000,
  rank, referrer, url, ua
}));
```

- **どこにある？** → 各ユーザーのブラウザ内（サーバーには送信されていません）
- **運営側に届く？** → **現在は届きません**（集めたデータをあなたが見ることは不可）
- **ブラウザを消したら？** → データは消えます
- **別のブラウザで診断した時** → 別データとして扱われます

つまり、現状は**運営側にはデータが一切届いていない**状態です。

---

## ✅ 本番運用するには（運営側でデータを受け取る）

`script.js` の先頭に、以下の行があります：

```js
const SIGNUP_WEBHOOK = ""; // ← ここにURLを入れると本番保存が有効になります
```

ここに保存先のWebhook URLを入れると、登録時に自動でそのURLにPOSTされます（localStorageへの保存は継続）。

### 選択肢：どこに溜めるか

| 方法 | 難易度 | コスト | 特徴 |
|:---|:---:|:---:|:---|
| **Google Apps Script + スプレッドシート** | ⭐ 簡単 | 無料 | 既存のGoogleアカウントで即時運用可 |
| **Formspree** | ⭐ 簡単 | 月50件まで無料 / 以降$10〜 | 設定不要、メール通知付き |
| **Airtable Webhook** | ⭐⭐ 中 | 無料枠あり | データベース的に使える |
| **Notion API (Proxy経由)** | ⭐⭐ 中 | 無料 | Notionで管理するなら便利 |
| **Supabase** | ⭐⭐⭐ やや手間 | 無料枠あり | 本格運用向け（認証・DB） |
| **Vercel Serverless Function + KV** | ⭐⭐⭐ やや手間 | 無料枠あり | 同じVercel内で完結 |

### 推奨：**Google Apps Script（最速 & 無料）**

1. Google Sheets で新規スプレッドシート作成
2. 拡張機能 → Apps Script
3. 以下のコードを貼り付け：

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(data.at),
    data.name || "",
    data.email || "",
    data.company || "",
    data.rank || "",
    data.referrer || "",
    data.url || "",
    data.ua || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ok: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. デプロイ → ウェブアプリとしてデプロイ
5. 「アクセス」を「全員」に設定
6. デプロイ後のURLをコピー
7. `script.js` の `SIGNUP_WEBHOOK` にペースト
8. Vercel再デプロイ

これで登録の度にスプレッドシートに自動追記されます。

---

## 🔐 プライバシーとGDPR・個人情報保護法

登録された時点で個人情報を取得しているので、**プライバシーポリシーの掲載**を推奨します：

- 収集目的：証明書発行・シェア機能・法人向け診断の先行案内
- 保管期間：目的終了後2年（任意）
- 第三者提供：なし（分析ツールを除く）
- 削除依頼の受付窓口：メールアドレス

テンプレが必要であれば生成できます。

---

## 📤 X（Twitter）シェア時の登録フロー

1. 診断完了 → 証明書画面で「SHARE TO X」を押す
2. 未登録なら → **登録モーダルが開く**（氏名・メール・会社名）
3. 「登録して続ける」押下 → `completeAuth()` 実行
   - localStorage に保存
   - `SIGNUP_WEBHOOK` が設定されていれば、そこにもPOST
4. モーダル閉じる → 自動的にX投稿インテントが開く

再訪時は登録済みなので、モーダルなしで直接シェアできます。

---

## ❓ 質問フローの戻るボタン

- 各質問画面の左下に「← 戻る」ボタンがあります（`#prevBtn`）
- 診断結果画面にも「← 質問に戻る」ボタンを追加しました（`#backToQuizBtn`）
- 「最初からやり直す」（`#retakeBtn`）で診断リセット
