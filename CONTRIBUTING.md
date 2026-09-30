# Contributing

Thanks for your interest in improving **openrouter-account-factory**!

## Getting started

```bash
git clone https://github.com/0xgetz/openrouter-account-factory.git
cd openrouter-account-factory
node --check src/index.mjs     # syntax check (no build step)
node src/index.mjs --help      # CLI smoke test
```

There are **no dependencies** to install.

## Pull request checklist

- [ ] `node --check src/index.mjs` passes
- [ ] `node src/index.mjs --help` prints the help text
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Docs updated if behaviour changed
- [ ] No secrets, tokens, generated accounts or API keys are committed

## Commit convention

```
feat:     a new feature
fix:      a bug fix
docs:     documentation only
refactor: code change that neither fixes a bug nor adds a feature
chore:    tooling / maintenance
```

## Reporting bugs

Use the issue templates in `.github/ISSUE_TEMPLATE/`. Please include:

- OS and Node version
- CDP endpoint type (Browser Use Cloud / local Chrome)
- The exact command you ran
- Relevant log output (redact any keys/emails)
