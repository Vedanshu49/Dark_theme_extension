# Smart Dark Theme Extension

A premium, intelligent dark theme browser extension built with Manifest V3. Intelligently analyzes DOM structures, preserves media, and provides granular control over darkness levels.

## Features

✨ **Smart DOM Analysis**
- Intelligently distinguishes between backgrounds, text, and media
- Respects contrast accessibility standards (WCAG)
- Dynamically applies theme to newly loaded content via MutationObserver

🎨 **Premium UI**
- Modern glassmorphism design
- Smooth animations and transitions
- Fully responsive popup interface

🎛️ **Granular Controls**
- Master toggle for per-site control
- Brightness slider (50% - 150%)
- Contrast slider (50% - 200%)
- Warmth/Blue Light Filter slider (0% - 100%)

💾 **Site Memory**
- Saves preferences per domain in localStorage
- Auto-applies theme on return visits
- Completely independent settings per site

🌐 **Cross-Browser Compatible**
- Chrome/Chromium
- Edge
- Firefox
- Brave/Vivaldi

## Project Structure

```
src/
├── popup/
│   ├── popup.html      # Popup UI markup
│   ├── popup.css       # Premium glassmorphism styles
│   └── popup.js        # Popup logic and event handling
├── content/
│   ├── dom-analyzer.js # Smart DOM analysis engine
│   └── content.js      # Content script with MutationObserver
└── service-worker/
    └── background.js   # Service worker for storage and messaging

manifest.json          # Manifest V3 configuration
```

## Installation

### For Chrome/Edge/Brave:
1. Save this folder
2. Go to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select this folder

### For Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from this folder

## How It Works

### DOM Analyzer
The `DOMAnalyzer` class intelligently categorizes elements:
- **Media Elements**: Images, videos, canvas, SVG, background-images (preserved)
- **Text Elements**: Paragraphs, spans, headings, buttons (inverted)
- **Container Elements**: Divs, sections, articles (transformed with contrast balancing)

### Color Inversion
Colors are inverted intelligently:
1. Parse RGB values
2. Invert to create dark theme
3. Apply brightness adjustment
4. Apply contrast multiplication
5. Apply warmth (sepia) filter
6. Clamp values to valid RGB range

### Dynamic Observation
MutationObserver watches for:
- New child elements (infinite scrolling)
- Style attribute changes
- Dynamically loaded content

All new elements are analyzed and transformed on-the-fly.

## Settings Storage

Settings are stored in `chrome.storage.local` keyed by domain:

```javascript
{
  "example.com": {
    enabled: true,
    brightness: 1.0,
    contrast: 1.0,
    warmth: 0.2
  }
}
```

## Technical Specifications

- **Manifest Version**: 3
- **Language**: Vanilla JavaScript (no dependencies)
- **Performance**: Optimized DOM traversal, efficient color math
- **Accessibility**: WCAG contrast ratio calculations built-in

## Future Enhancements

- Custom color scheme selection
- Whitelist/blacklist for specific elements
- Scheduled theme (auto-enable at sunset)
- Sync settings across devices
- Per-element customization

## License

MIT
"# Dark_theme_extension" 
