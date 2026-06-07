# Dota Map

Dota Map is a local-only Windows helper for switching Dota 2 terrain `.vpk` filenames through a black-and-orange browser UI.

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

## How It Works

Pick the terrain file you want to try, then pick the active terrain slot you already selected in Dota 2. For example, if Dota is currently configured to use the Winter terrain, choose `dota_winter.vpk` as the slot file and choose another `.vpk` as the replacement.

Use **Dry run** first to preview the operation. Dry run does not require Dota to be closed and does not create backups.

When you switch maps repeatedly, Dota Map automatically restores the previous active filename swap before applying the new one. This prevents chained swaps from leaving older terrain files under the wrong names.

## Map Compatibility Labels

- **Current-layout terrain**: cosmetic terrain packages such as Winter, Autumn, Desert, Immortal Gardens, The Emerald Abyss, Reef's Edge, and Sanctums of the Divine.
- **Not ranked-compatible**: historical main-map packages such as `dota_683.vpk`, `dota_706.vpk`, and `dota_737.vpk`. These are old full map resources, not normal terrain skins, so the UI marks them as unable to normally enter ranked matchmaking.
- **Ranked caution**: alternate or event map packages. Test these in a lobby or unranked context before using them around ranked matchmaking.

## Safety

- The app only accepts local file names inside the selected maps directory.
- Every real switch creates timestamped backup copies before any rename happens.
- Dota must be closed before switching or restoring.
- Restore uses the selected backup manifest to copy original files back to their original names.
- The app binds to `127.0.0.1`; it is not a public web service.

## Development

```powershell
npm test
npm start
```

No npm dependencies are required.
