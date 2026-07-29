# Dota Map

Dota Map is a local-only Windows helper for switching Dota 2 terrain `.vpk` filenames, detecting the real active terrain state, and managing simple Dota 2 chat binds through a black-and-orange browser UI.

It does not include, download, or redistribute any Dota 2 map files. Users must provide their own local Dota 2 installation and map files.

## Requirements

- Windows
- Node.js 18 or newer
- A local Dota 2 install

The default maps directory is:

```text
E:\steam\steamapps\common\dota 2 beta\game\dota\maps
```

You can edit the path in the UI if your Steam library is somewhere else.

## Run

Double-click:

```text
DotaMap.cmd
```

Or run manually:

```powershell
npm start
```

Then open:

```text
http://localhost:17777
```

The server opens the correct local URL automatically. If port `17777` is busy, it retries nearby ports and opens the actual URL it selected.

## How It Works

Pick the terrain file you want to try, then pick the active terrain slot you already selected in Dota 2. For example, if Dota is currently configured to use the Winter terrain, choose `dota_winter.vpk` as the slot file and choose another `.vpk` as the replacement.

Use **Dry run** first to preview the operation. Dry run does not require Dota to be closed and does not create backups.

When you switch maps repeatedly, Dota Map automatically restores the previous active filename swap before applying the new one. This prevents chained swaps from leaving older terrain files under the wrong names.

## Automatic Map Detection

Dota Map does not blindly trust `.dota-map-active.json`. On every scan it validates the current source and slot files against the backup signatures from the last switch.

- If the active swap still matches the recorded signatures, the UI shows the real map currently inside the selected slot.
- If Steam updated Dota and overwrote those `.vpk` files, the old active record is marked stale and automatically ignored.
- If the files are back in their original slots, the stale record is cleared and the app falls back to filename-based detection.
- When starting a new switch, stale records are skipped instead of being restored, so an old pre-update swap cannot corrupt current files.

This means if `dota_winter.vpk` used to contain `dota_ti10.vpk` but a later Dota update restored both files, Dota Map will treat the Winter slot as Winter again.

## Chat Binds

The **Chat binds** panel writes a managed block to:

```text
...\steamapps\common\dota 2 beta\game\dota\cfg\autoexec.cfg
```

By default it creates:

```cfg
bind "F6" "say 已经预测他们队伍将取得胜利！; say 已经连续2688次成功预测了胜利。"
bind "-" "say XXX由于长时间没有重连至游戏，系统判定他为逃跑。; say 剩余玩家可以自由退出。"
```

You can customize both keys and both message groups in the UI. Each textarea line becomes one `say` command. The tool blocks English semicolons and quotes in message text so a typo cannot accidentally inject another console command.

Use **Preview** first to inspect the generated cfg block. Use **Write CFG** to create or update the block. If `autoexec.cfg` already exists, Dota Map stores a backup under `.dota-map-cfg-backups` before writing. Use **Remove** to delete only the Dota Map managed block while preserving the rest of the file.

Restart Dota after writing the binds. If your local setup does not auto-run `autoexec.cfg`, add this Steam launch option:

```text
+exec autoexec.cfg
```

## Map Compatibility Labels

- **Current-layout terrain**: cosmetic terrain packages such as Winter, Autumn, Desert, Immortal Gardens, The Emerald Abyss, Reef's Edge, and Sanctums of the Divine.
- **Not ranked-compatible**: historical main-map packages such as `dota_683.vpk`, `dota_706.vpk`, and `dota_737.vpk`. These are old full map resources, not normal terrain skins, so the UI marks them as unable to normally enter ranked matchmaking.
- **Ranked caution**: alternate or event map packages. Test these in a lobby or unranked context before using them around ranked matchmaking.

## Safety

- The app only accepts local file names inside the selected maps directory.
- Every real switch creates timestamped backup copies before any rename happens.
- Every switch record stores file signatures so later scans can verify whether the swap is still real.
- Dota must be closed before switching or restoring.
- Restore uses the selected backup manifest to copy original files back to their original names.
- Chat bind writes only touch the selected `autoexec.cfg` file and only replace the block between Dota Map markers.
- The app binds to `127.0.0.1`; it is not a public web service.

## Development

```powershell
npm test
npm start
```

No npm dependencies are required.

## Package

```powershell
npm run package:win
npm run package:exe
```

The zip is written to `dist/dota-map-windows-0.3.0.zip`. The package includes the orange-black `dota2map` icon in `assets/` and does not include any `.vpk` files.

The EXE package is written to `dist/dota-map-windows-exe-0.3.0.zip`. It contains `DotaMap.exe`, so users do not need to install Node.js separately.
