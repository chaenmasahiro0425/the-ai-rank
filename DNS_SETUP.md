# 🌐 ai-rank.org のDNS設定手順

**現状:** ドメインは Vercel プロジェクト `the-ai-rank` にエイリアス済み。SSL証明書の発行を待機中。
**必要:** ドメインを購入した**レジストラ側でDNSを Vercel に向ける**設定。

---

## 🎯 最速ルート：Vercel ネームサーバー（推奨）

一番ラクで、Vercelが全部管理してくれます。

### 手順

1. レジストラのダッシュボードを開く（どこで買ったかによる：Cloudflare / Namecheap / お名前.com / Google Domains 等）
2. 「DNSネームサーバー」または「Nameservers」の設定画面へ
3. **現在のネームサーバーを削除**し、以下に置き換え：

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

4. 保存
5. 反映待ち（通常15分〜48時間、多くは30分以内）
6. Vercel Dashboard → `the-ai-rank` → Settings → Domains で緑色の「Valid Configuration」になれば完了

完了後は、`https://ai-rank.org` でLPが開きます（SSL自動発行）。

---

## 🔧 代替ルート：Aレコード / CNAME方式

既存のDNS（Cloudflare等）を維持したい場合。

### レジストラ（またはCloudflare等）のDNS設定で以下を追加：

| タイプ | ホスト | 値 | TTL |
|:---|:---|:---|:---:|
| A | @ （または空欄／ai-rank.org） | `76.76.21.21` | Auto |
| CNAME | www | `cname.vercel-dns.com.` | Auto |

- 既存の A/AAAA/CNAME レコードがあれば削除（Vercel側と衝突します）
- Cloudflare を使う場合は「プロキシ（オレンジ雲）をOFF」にして DNS only 状態に

反映後、Vercelが自動でSSL証明書を発行します。

---

## ✅ 設定後の確認

```bash
# DNS反映チェック
dig ai-rank.org +short
# → 76.76.21.21 が返ればOK

dig www.ai-rank.org +short
# → cname.vercel-dns.com. → Vercel IP が返ればOK
```

または：
- https://ai-rank.org に直接アクセス → LPが開けばOK
- Vercel Dashboard の Domains タブで `Valid Configuration` (緑) 表示

---

## 🚧 SSL発行について

DNSが正しく向いた時点で、Vercelが Let's Encrypt から自動的に SSL証明書を発行します。
通常は数分〜最大1時間程度。

---

## 🎁 おまけ：www → apex のリダイレクト

`www.ai-rank.org` → `ai-rank.org` に301リダイレクトしたい場合、Vercel Dashboard の Domains 画面で `www.ai-rank.org` を `Redirect to ai-rank.org` に設定してください。
