# Mizuki Content Manager

Mizuki Content Manager is a local visual editor for Mizuki blog content. It reads a Mizuki code repository, detects whether content is integrated or separated, and provides structured editing for common content files.

## Features

- Detects Mizuki content mode from the selected code repository.
- Supports integrated content repositories and separated content repositories using `CONTENT_DIR`.
- Edits Mizuki content categories including about, diary, friends, blog posts, projects, timeline, skills, devices, AI tools, anime, and albums.
- Provides a VS Code-like file tree for direct Markdown and TypeScript editing.
- Supports local image upload and preview for diary, devices, anime, and albums.
- Supports external image URLs where Mizuki supports them:
  - diary images can mix local paths and external URLs;
  - device images and anime covers can use either a local path or an external URL;
  - albums use either local mode or external mode, matching Mizuki's album documentation.
- Starts and embeds the selected Mizuki repository preview with `pnpm dev`.
- Keeps edits in memory until you click `保存记录` or `保存`.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- A Mizuki code repository on the same machine

Enable pnpm through Corepack if needed:

```bash
corepack enable
```

## Install

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

Paste the Mizuki code repository path in the left panel, then click `确定`.

## Content Mode Detection

The manager checks the selected Mizuki repository's `.env` file:

- If `ENABLE_CONTENT_SYNC=true`, content is read from `CONTENT_DIR`, defaulting to `./content`.
- Otherwise, content is read from the integrated Mizuki repository structure:
  - `src/data`
  - `src/content/posts`
  - `src/content/spec`
  - `public/images`

The selected path is saved locally in `.mcm-config.json`, which is intentionally ignored by Git.

## Scripts

```bash
pnpm dev       # start the editor
pnpm check     # run Astro type checks
pnpm build     # type-check and build
pnpm preview   # preview the built app locally
pnpm start     # run the standalone build
```

## Notes

This project previously contained a Gradio prototype. The current maintained implementation is the Astro application in `src/`.
