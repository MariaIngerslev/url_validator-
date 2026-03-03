# Dark Mode Design

**Date:** 2026-03-03
**Status:** Approved

## Summary

Add a manual dark mode toggle to the portfolio site. User preference is persisted in `localStorage`. The warm parchment aesthetic is preserved in dark mode via warm dark grays/browns.

## Approach

`[data-theme="dark"]` attribute on `<html>`, set by a synchronous inline script in `<head>` to prevent flash of wrong theme (FOUC). CSS token overrides live in `[data-theme="dark"] :root {}`. A toggle button in the header nav controls the switch.

## Files Changed

- `public/index.html` — anti-FOUC inline script, toggle button in header nav
- `public/styles.css` — `[data-theme="dark"] :root {}` token override block, theme transition on `body`
- `public/client.js` — `initDarkMode()` function

## Color Token Overrides (warm dark palette)

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#e7dfd1` | `#1c1a17` |
| `--color-surface` | `#ffffff` | `#252220` |
| `--color-text` | `#242424` | `#e8e0d4` |
| `--color-text-muted` | `#757575` | `#9a9084` |
| `--color-border` | `#e0ddd6` | `#3a3530` |
| `--color-border-hover` | `#c4c1ba` | `#504840` |
| `--color-border-strong` | `#9a9590` | `#6a6058` |
| `--color-primary-light` | `#e8f5e8` | `#1a2e1a` |
| `--color-header-bg` | `rgba(232,225,212,0.92)` | `rgba(28,26,23,0.92)` |
| `--color-sidebar-bg` | `#d0c8c0` | `#2e2a26` |
| `--color-success-bg` | `#e8f5e8` | `#1a2e1a` |
| `--color-success-border` | `#a8d5a8` | `#2d5a2d` |
| `--color-warning-bg` | `#fffbeb` | `#2a2010` |
| `--color-warning-border` | `#fde68a` | `#6b520a` |
| `--color-error-bg` | `#fef2f2` | `#2a1010` |
| `--color-error-border` | `#f5c6c6` | `#6b1a1a` |
| `--color-forest-green-hover` | `rgba(45,79,30,0.07)` | `rgba(45,79,30,0.18)` |

Brand greens, action colors, and CTA colors are unchanged — they work on both backgrounds.
Code peek blocks (Monokai) are already dark-inverted — no change needed.

## Toggle Button

`<button class="btn-theme-toggle">` in the header nav, before the nav links.
- Sun icon (☀) shown in dark mode
- Moon icon (☾) shown in light mode
- `aria-label` updates: "Skift til lyst tema" / "Skift til mørkt tema"
- Minimal icon button styling — no border, no background

## Anti-FOUC

Inline `<script>` at end of `<head>` (before `</head>`):

```html
<script>if(localStorage.getItem('theme')==='dark')document.documentElement.setAttribute('data-theme','dark');</script>
```

## Transition

`transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease` on `body` for a smooth mode switch.
