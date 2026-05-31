# iPad Space Invaders

A retro Space Invaders-style game built for Safari on iPad.

## Features
- Touch controls for iPad
- Keyboard controls for desktop testing
- Proper start screen and pause/resume support
- Score, best score, lives, levels, and wave label
- Classic, zigzag, dive, and boss waves
- Shields, particle bursts, and richer arcade visuals
- Synth sound effects plus lightweight background music
- Add-to-Home-Screen friendly PWA setup
- GitHub Pages friendly static site

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
- Tap the pause button to pause/resume
- Tap the speaker button to mute/unmute

### Keyboard
- `←` / `→` to move
- `Space` to fire
- `P` to pause/resume
- `Enter` to start/restart

## GitHub Pages
After pushing to `main`:
1. Open the repo on GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**
4. Set branch to **main** and folder to **/ (root)**
5. Save and wait a minute or two
6. Your site should appear at:
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
