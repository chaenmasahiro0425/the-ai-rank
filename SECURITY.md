# Security Policy

THE AI RANK の脆弱性報告受付窓口です。

## Reporting a vulnerability

脆弱性を発見された場合は、**公開イシューを作成せず**、以下のいずれかの方法でご連絡ください：

1. **GitHub Security Advisory**（推奨）
   [https://github.com/chaenmasahiro0425/the-ai-rank/security/advisories/new](https://github.com/chaenmasahiro0425/the-ai-rank/security/advisories/new)
2. **X (DM)**
   [@masahirochaen](https://x.com/masahirochaen)

## What to include

- 脆弱性の種類（例：XSS、SSRF、認可不備、情報露出）
- 再現手順（できれば最小PoC）
- 影響範囲の想定
- 発見日時

## Response

- 初回応答：**3営業日以内**を目標
- 修正までの期間：影響度により異なります（Critical は最短 72 時間、Low は数週間）
- 修正後、Advisory にて公表（報告者クレジット希望の有無は事前に確認）

## Scope

対象：
- `https://ai-rank.org` およびサブドメイン
- `the-ai-rank.vercel.app`
- このリポジトリに含まれる全コード／設定

対象外：
- 第三者サービス（Supabase, Vercel 等）の内部バグ ─ 各社に直接ご連絡ください
- Social engineering / 物理的攻撃
- DoS / 負荷試験
- 既知の自動化された脆弱性スキャナのレポートのみ（再現 PoC がない場合）

## Safe harbor

善意の脆弱性調査であり、本ポリシーに従ってご報告いただいた場合、法的責任を問いません。
