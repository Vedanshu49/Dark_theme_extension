/**
 * DOM Analyzer Engine
 * Intelligently analyzes and transforms DOM elements for dark theme
 * Respects media, preserves visual identity, ensures accessibility
 */

class DOMAnalyzer {
  constructor() {
    this.mediaSelectors = [
      'img', 'video', 'canvas', 'svg',
      '[style*="background-image"]',
      'picture', 'iframe'
    ];
    
    this.textElements = ['p', 'span', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'button'];
    this.containerElements = ['div', 'section', 'article', 'main', 'aside', 'nav', 'header', 'footer'];
    
    this.elementCache = new WeakMap();
  }

  /**
   * Analyzes if an element is media (image, video, canvas, etc.)
   */
  isMediaElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    
    // Direct media tags
    if (['img', 'video', 'canvas', 'svg', 'picture', 'iframe'].includes(tagName)) {
      return true;
    }
    
    // SVG content
    if (element.closest('svg')) return true;
    
    // background-image
    const style = window.getComputedStyle(element);
    if (style.backgroundImage && style.backgroundImage !== 'none') {
      return true;
    }
    
    // Data URIs for images
    const src = element.getAttribute('src') || element.getAttribute('data');
    if (src && (src.includes('data:image') || src.includes('data:video'))) {
      return true;
    }
    
    return false;
  }

  /**
   * Analyzes if element should be treated as text
   */
  isTextElement(element) {
    const tagName = element.tagName.toLowerCase();
    return this.textElements.includes(tagName);
  }

  /**
   * Analyzes if element is a container/background
   */
  isContainerElement(element) {
    const tagName = element.tagName.toLowerCase();
    return this.containerElements.includes(tagName) || element.classList.length > 0;
  }

  /**
   * Calculate relative luminance (WCAG standard)
   */
  getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(x => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio (WCAG standard)
   */
  getContrastRatio(rgb1, rgb2) {
    const lum1 = this.getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = this.getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Parse RGB color string
   */
  parseRGB(color) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    
    // Handle rgba
    const matchA = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (matchA) {
      return [parseInt(matchA[1]), parseInt(matchA[2]), parseInt(matchA[3])];
    }
    
    return null;
  }

  /**
   * Convert RGB to HSL for better color manipulation
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h, s, l];
  }

  /**
   * Convert HSL back to RGB
   */
  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  }

  /**
   * Intelligently invert colors for dark theme
   */
  invertForDarkTheme(color, settings = {}) {
    const brightness = settings.brightness ?? 1;
    const contrast = settings.contrast ?? 1;
    const warmth = settings.warmth ?? 0; // Sepia/warmth adjustment

    const rgb = this.parseRGB(color);
    if (!rgb) return color;

    let [r, g, b] = rgb;
    
    // Step 1: Invert to create dark theme
    let [invR, invG, invB] = [255 - r, 255 - g, 255 - b];

    // Step 2: Apply brightness (scale towards or away from 128)
    // brightness < 1 = darker, brightness > 1 = lighter
    invR = 128 + (invR - 128) * brightness;
    invG = 128 + (invG - 128) * brightness;
    invB = 128 + (invB - 128) * brightness;

    // Step 3: Apply contrast (scale around 128)
    invR = 128 + (invR - 128) * contrast;
    invG = 128 + (invG - 128) * contrast;
    invB = 128 + (invB - 128) * contrast;

    // Step 4: Apply warmth (reduce blue light, add warmth for evening use)
    if (warmth > 0) {
      invR = Math.min(255, invR + warmth * 25);
      invG = Math.min(255, invG + warmth * 15);
      invB = Math.max(0, invB - warmth * 40);
    }

    // Step 5: Clamp values to valid RGB range
    invR = Math.max(0, Math.min(255, invR));
    invG = Math.max(0, Math.min(255, invG));
    invB = Math.max(0, Math.min(255, invB));

    return `rgb(${Math.round(invR)}, ${Math.round(invG)}, ${Math.round(invB)})`;
  }

  /**
   * Check if contrast meets WCAG AA standard (4.5:1 for text)
   */
  meetsAccessibilityStandard(textColor, bgColor, isLargeText = false) {
    const textRGB = this.parseRGB(textColor);
    const bgRGB = this.parseRGB(bgColor);

    if (!textRGB || !bgRGB) return true; // Assume OK if can't parse

    const ratio = this.getContrastRatio(textRGB, bgRGB);
    const requiredRatio = isLargeText ? 3 : 4.5;

    return ratio >= requiredRatio;
  }

  /**
   * Main analysis function - determines how to transform an element
   */
  analyzeElement(element) {
    if (this.elementCache.has(element)) {
      return this.elementCache.get(element);
    }

    const analysis = {
      isMedia: this.isMediaElement(element),
      isText: this.isTextElement(element),
      isContainer: this.isContainerElement(element),
      shouldInvert: false,
      shouldPreserve: false
    };

    if (analysis.isMedia) {
      analysis.shouldPreserve = true;
    } else if (analysis.isText || !analysis.isContainer) {
      analysis.shouldInvert = true;
    } else {
      analysis.shouldInvert = true;
    }

    this.elementCache.set(element, analysis);
    return analysis;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMAnalyzer;
}
