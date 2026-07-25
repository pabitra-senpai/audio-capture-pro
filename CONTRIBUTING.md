# Contributing to Audio Capture Pro

Thanks for taking the time to contribute! This document covers the basics for getting a change merged.

## Getting set up

```bash
git clone https://github.com/pabitra-senpai/audio-capture-pro.git
cd audio-capture-pro
npm install
npm run dev
```

Then load the generated `dist/` folder as an unpacked extension in `chrome://extensions` (enable Developer mode first). Reload the extension after service worker or manifest changes.

## Before you open a PR

- [ ] `npm run typecheck` passes with no errors.
- [ ] `npm run build` completes successfully.
- [ ] You manually tested the affected flow (start/stop/pause/resume recording, popup, history, or settings — whichever you touched) by loading the unpacked extension.
- [ ] No stray build artifacts (`*.js` next to `*.ts` files, `dist/`, `release/`) are committed. Check `git status` before committing.
- [ ] The PR description explains **what** changed and **why**, and links any related issue.

## Commit style

Conventional, short, imperative commit messages are preferred, e.g.:

```
fix: remove forced sampleRate on live capture AudioContext
docs: update installation steps
chore: remove stray compiled js files from src
```

## Reporting bugs

Use the **Bug report** issue template. Include:

- Browser + OS (and version) — Chromium forks like Kiwi Browser on Android behave differently from desktop Chrome, so please be specific.
- Steps to reproduce.
- What you expected vs. what happened.
- Console errors from the popup, options page, offscreen document, or service worker if available (`chrome://extensions` → Inspect views).

## Proposing features

Open an issue with the **Feature request** template before writing a large PR — it saves everyone time if the direction needs discussion first. Small, self-contained improvements (UI polish, a clearer error message, a doc fix) don't need this step; just open a PR.

## Code style

- TypeScript, strict mode is on (`tsconfig.json`) — keep it that way.
- No unused locals/params (enforced by the compiler options already).
- Match the existing file/folder structure described in the README's [Architecture](README.md#architecture) section rather than introducing new top-level patterns.
- There's no linter/formatter configured yet — matching the surrounding code's style is enough for now. Setting up ESLint/Prettier with a CI check is itself a welcome contribution (see the Roadmap in the README).

## Questions

If anything here is unclear, open an issue — improving this document is a valid contribution too.
