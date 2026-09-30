<div align="center">

# OpenRouter Account Factory

**コマンド1つで OpenRouter アカウントをエンドツーエンドで作成・検証 —— 登録、メール認証、オンボーディング、APIキー発行まで。**

[![CI](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](../package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet.svg)](#コントリビュート)
[![GitHub stars](https://img.shields.io/github/stars/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/network/members)
[![GitHub issues](https://img.shields.io/github/issues/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/issues)
[![Last commit](https://img.shields.io/github/last-commit/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/commits/main)

[English](../README.md) · [Bahasa Indonesia](README.id.md) · [Español](README.es.md) · [中文](README.zh.md) · [日本語](README.ja.md)

</div>

---

## 概要

`openrouter-account-factory` は、[Zenvex](https://zenvex.dev) の一時メールアドレスを使って
OpenRouter アカウント作成を完全に自動化する、依存ゼロの Node.js CLI です。
**Chrome DevTools Protocol (CDP)** 経由で実際の Chrome/Chromium ブラウザを操作し、人が行う
すべての手順を実行します。

1. **登録** —— OpenRouter の登録フォームに入力。
2. **認証** —— 一時受信箱から認証リンクを取得して開く。
3. **オンボーディング** —— 登録後のアンケートを完了。
4. **キー発行** —— 無期限・無制限の新しい API キーを作成してコピー。

エンドツーエンドで検証済み: `--count 10` の実行で **10/10 アカウント** 成功。

> [!IMPORTANT]
> 本ツールは**正当なテスト、QA、研究、教育目的のみ**を対象としています。OpenRouter の利用規約
> および適用法を遵守する責任は利用者にあります。自己責任でご利用ください。

## 特徴

- ⚡ **依存ゼロ** —— 組み込みのグローバル `WebSocket` を使用（Node ≥ 20）。
- 🌐 **どこでも動作** —— 任意の CDP エンドポイント: Browser Use Cloud、Docker Chrome、ローカル Chrome。
- 📧 **一時メール認証** —— 受信箱のポーリングとリンク抽出を自動化。
- 🛡️ **対ボット対応** —— Cloudflare の `protect-check` インタースティシャルを待機。
- 🔑 **キー発行** —— 名前付き `Main Key`（無期限・無制限）を作成。
- 🧩 **スクリプト化可能** —— 整った JSONL 出力、`--count N`、名前/ドメイン/パスワードを設定可能。
- 🔁 **堅牢** —— 古い CDP ターゲットを自動再試行し、余分なタブを自動的に閉じる。

## 動作要件

| 要件 | 詳細 |
|---|---|
| **Node.js** | `>= 20`（組み込み `WebSocket`；`npm install` 不要） |
| **ブラウザ** | CDP WebSocket エンドポイントを公開する任意の Chrome/Chromium |
| **OS** | Linux、macOS、Windows |

## インストール

```bash
git clone https://github.com/0xgetz/openrouter-account-factory.git
cd openrouter-account-factory
# npm install は不要 —— 依存ゼロ
```

## 使い方

CLI を CDP エンドポイントに向けて実行します:

```bash
BU_CDP_WS="wss://<your-browser>/devtools/browser/<id>" \
  node src/index.mjs --count 10 --password 'YourPassword!1' --out ./openrouter_accounts.jsonl
```

### CLI オプション

| フラグ | 既定値 | 説明 |
|------|--------|------|
| `--count N` | `1` | 作成するアカウント数 |
| `--password P` | ランダム | 全アカウント共通のパスワード |
| `--first NAME` | `Budi` | 登録時の名 |
| `--last NAME` | `Santoso` | 登録時の姓 |
| `--domain D` | `souss.dev` | Zenvex 受信ドメイン |
| `--out PATH` | `./openrouter_accounts.jsonl` | 結果ファイル（1行1 JSON） |
| `--cdp URL` | `$BU_CDP_WS` / `$BU_CDP_URL` | CDP WebSocket エンドポイント |
| `--help`, `-h` | — | ヘルプ表示 |
| `--version`, `-v` | — | バージョン表示 |

### ブラウザの接続

**方法 A —— Browser Use Cloud**

```bash
export BU_CDP_WS="wss://<session>.cdp.browser-use.com/devtools/browser/<id>"
node src/index.mjs --count 5
```

**方法 B —— ローカル Chrome**

```bash
# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=./.chrome-profile
# その後
node src/index.mjs --cdp "$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)" --count 1
```

## 出力

結果は `--out` ファイルに JSONL として追記されます:

```json
{"email":"orm60kb1mg5r@souss.dev","key":"sk-or-v1-bf95...1c6f","ok":true,"created":"2026-09-29T04:11:08.371Z"}
```

読みやすいサンプルページは `docs/sample-output.html` にあります。

## 仕組み

1. Zenvex の `souss.dev` ドメインでランダムなアドレスを生成し、受信箱を開く。
2. OpenRouter の登録フォームに入力して送信する。
3. Cloudflare の `protect-check` インタースティシャルを待つ。
4. 認証メールを開き、そのリンクを辿ることでアカウントにログインする。
5. オンボーディングのアンケートを完了する。
6. 新しい `Main Key`（無期限・無制限）を作成し、クリップボードから読み取る。

## プロジェクト構成

```
openrouter-account-factory/
├── src/
│   └── index.mjs                 # CLI 本体 + CDP クライアント（依存ゼロ）
├── docs/
│   ├── README.id.md              # Bahasa Indonesia
│   ├── README.es.md              # Español
│   ├── README.zh.md              # 中文
│   ├── README.ja.md              # 日本語
│   ├── ARCHITECTURE.md
│   └── sample-output.html
├── .github/
│   ├── workflows/ci.yml
│   └── ISSUE_TEMPLATE/
├── package.json
├── LICENSE
└── README.md
```

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| `Temporary email services are not supported` | ドメインがブロック対象。`--domain souss.dev` を使用。 |
| `Verifying your request` で停止 | Cloudflare `protect-check`。スクリプトは約2分待機します。ブラウザを起動したままにしてください。 |
| `Session with given id not found` | CDP ターゲットが古い。スクリプトが自動再接続します。続く場合はブラウザを再起動。 |
| `no verification link` | 受信箱のプレビューが未読み込み。スクリプトは行を選択して Enter を押します。 |
| `zenvex address mismatch` | Zenvex が前回のセッションアドレスを保持。スクリプトが再送信します。タブを1つにしてください。 |

## コントリビュート

コントリビュート歓迎です！PR をお送りください:

1. リポジトリをフォーク
2. ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'feat: add amazing feature'`）
4. プッシュして Pull Request を作成

## ライセンス

**MIT ライセンス** の下で配布されています。詳細は [`LICENSE`](../LICENSE) をご覧ください。

## 免責事項

本プロジェクトは教育および正当なテスト目的で提供されます。作者は誤用や第三者利用規約の違反に
ついて責任を負いません。

<div align="center">

Made with ❤️ by [0xgetz](https://github.com/0xgetz)

⭐ **役に立ったらスターをお願いします！**

</div>
