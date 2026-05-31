# iPad Space Invaders

A retro Space Invaders-style game built for Safari on iPad.

## Features
- Touch controls for iPad
- Keyboard controls for desktop testing
- Score, best score, lives, levels
- Retro arcade styling with shields and particle bursts
- Simple synthesized sound effects
- Add-to-Home-Screen friendly PWA setup
- GitHub Pages deploy workflow

## Local run
```bash
python3 -m http.server 8000
```

Then open:
- `http://localhost:8000`

## Controls
### iPad
- Drag on the game area to move
- Or hold the left/right buttons
- Tap `FIRE` to shoot
- Tap `Start Game` to begin

### Keyboard
- `←` / `→` to move
- `Space` to fire
- `Enter` to start/restart

## GitHub Pages
This repo includes `.github/workflows/pages.yml`.

After pushing to `main`:
1. Open the repo on GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, ensure **Source** is set to **GitHub Actions**
4. Wait for the Pages workflow to finish
5. Your site should appear at something like:
   - `https://eboof.github.io/iPad-space-invaders/`

## Add to Home Screen on iPad
1. Open the deployed URL in Safari
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. Launch it from the home screen for a full-screen feel

## Files
- `index.html`
- `style.css`
- `game.js`
- `manifest.webmanifest`
- `sw.js`
- `.github/workflows/pages.yml`
