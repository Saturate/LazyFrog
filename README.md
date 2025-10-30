## 🐸 LazyFrog

LazyFrog is a browser extension that automates the Sword & Supper Reddit game. It scans missions, stores them locally, and plays them automatically based on your configured filters.

### Download

Find the newest release at [lazyfrog.akj.io](https://lazyfrog.akj.io/).

### Browser Support

- ✅ Chrome
- ✅ Brave
- ✅ Edge
- ✅ Other Chromium-based browsers
- ❌ Firefox (not currently supported)
- ❌ Safari (not currently supported)

### Features

- **One-click automation**: Start/stop from the page or toolbar popup
- **Mission scanning**: Automatically detects and stores missions as you browse
- **Smart filtering**: Configure star difficulty and level range
- **Auto-play**: Automated gameplay with configurable strategies
- **Mission database**: Local storage with export capability

### FrogDB

[FrogDB](https://frogdb.akj.io/) is a community-contributed mission database for Sword & Supper. Browse, search, and import missions discovered by other players. The extension includes a one-click import feature to easily add missions from FrogDB to your local database.

### For Developers

See [extension/README.md](extension/README.md) for setup, architecture, and debugging information.

Quick start:
```bash
cd extension
pnpm install
pnpm build
```

Then load `extension/dist/` as an unpacked extension in your browser.

### Feedback

Found an issue or have a suggestion? [Open an issue](https://github.com/Saturate/AutoSupper/issues).
