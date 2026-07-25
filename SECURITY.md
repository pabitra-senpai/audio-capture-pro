# Security Policy

## Supported Versions

This project currently ships a single active version (see `manifest.ts` for
the current version number). Security fixes are made against the `main`
branch and released as a new tag.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report it privately using one of these methods:

1. **GitHub Security Advisories** (preferred): go to the repo's **Security**
   tab → **Advisories** → **Report a vulnerability**.
2. If that's not available, open a regular issue titled only
   "Security contact needed" with no details, and the maintainer will follow
   up privately for the report.

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof of concept if possible.
- The browser/OS/version you tested on.

## Scope notes

Audio Capture Pro:

- Stores all recordings and settings **locally** (IndexedDB / `chrome.storage.local`); there is no backend server and no network calls.
- Does not request `<all_urls>` host permissions.
- Does not execute remote code.

Reports about the extension's requested permissions being misused, the
offscreen document, message-passing between contexts, or the build/release
pipeline (`.github/workflows`) are all in scope.

We'll do our best to acknowledge reports promptly and keep you updated as a
fix is worked on.
