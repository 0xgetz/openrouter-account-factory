# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-29

### Added
- End-to-end OpenRouter account creation via Zenvex temporary email.
- Zero-dependency CDP client built on Node's global `WebSocket`.
- Automatic Cloudflare `protect-check` handling.
- Automatic verification-link retrieval from the Zenvex inbox.
- Onboarding survey automation.
- `Main Key` (no expiry, no limit) provisioning with clipboard capture.
- JSONL result output and `--count`, `--password`, `--first`, `--last`, `--domain`, `--out`, `--cdp` flags.
- Automatic retry on stale CDP targets and tab collapsing.
- 5 READMEs: English, Bahasa Indonesia, Español, 中文, 日本語.
- GitHub Actions CI, issue templates, MIT license.

### Verified
- `--count 10` completed 10/10 accounts end-to-end.
