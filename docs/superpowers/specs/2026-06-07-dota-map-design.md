# Dota Map Design

## Goal

Build a local Windows tool named Dota Map that lets the user safely swap Dota 2 terrain `.vpk` filenames from a polished black-and-orange parody launcher UI with Chinese and English text support.

## Scope

The first release is a local browser app backed by a Node.js server. It scans a user-provided Dota maps directory, lists likely terrain `.vpk` files, lets the user choose a selected source map and an active slot file, performs a dry run, switches filenames with backup copies, and restores from backups.

The project must not bundle, upload, download, or redistribute any Dota `.vpk` files. GitHub publication includes only source code, tests, docs, and launcher scripts.

## Architecture

`src/mapManager.js` owns all filesystem logic: path validation, map scanning, process checks, dry-run planning, backup creation, filename swapping, backup listing, and restore. `src/server.js` exposes a small local JSON API and serves the static UI. `public/` contains the bilingual black-and-orange Dota Map UI.

## UI

The UI uses the approved `Dota Map` name. The logo is text-based: white `Dota` plus an orange `Map` block. The top-right area includes a Chinese / English segmented language switch. The main surface shows a left map list, center active-slot switch panel, and right operation queue / backup status panel.

## Safety And Errors

The app rejects path traversal and only operates on file basenames ending in `.vpk`. Switch and restore operations require both source files to exist and reject identical source/slot selections. Before modifying files, the app checks whether Dota appears to be running on Windows. It creates timestamped backup copies before any rename. If a rename fails, errors are returned to the UI and the backup remains available.

## Testing

Unit tests use temporary directories and fake `.vpk` text content to verify scan filtering, dry-run planning, backup creation, filename swapping, restore behavior, and invalid file rejection. Browser validation checks that the local UI loads and exposes the expected Dota Map controls.
