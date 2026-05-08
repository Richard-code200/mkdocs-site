# AGENTS.md

## Stack

- 使用中文展示Thinking部分内容,
- **MkDocs** with **`terminal`** theme (NOT `mkdocs-material`), palette `gruvbox_dark`
- Chinese (zh) language content, deployed at `https://richard-code200.github.io/mkdocs-site/`

## Commands

```sh
mkdocs build              # build site into site/
mkdocs gh-deploy --force  # deploy to gh-pages branch
```

## Key config quirks

- **No `nav` in `mkdocs.yml`** — navigation is auto-generated from `docs/` directory structure
- **Callout syntax** uses `///` blocks (pymdownx.blocks.details), NOT `!!! note` material admonitions:

  ```markdown
  /// info | Title
  content
  ///
  ```

  Three types: `info`, `warning`, `important`

- Highlight.js for code blocks (loaded via CDN + `docs/add_hljs_highlight.js`)
- `site/` is gitignored

## Deployment

- GitHub Actions on push to `main` (`.github/workflows/publish.yml`)
- Pipeline installs both `mkdocs-material` and `mkdocs-terminal` — only `terminal` is used
- Deploys via `mkdocs gh-deploy --force`
