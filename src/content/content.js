/**
 * Content Script
 * Applies dark theme intelligently, monitors for new content
 */

const analyzer = new DOMAnalyzer();
let currentSettings = {
  enabled: false,
  brightness: 1,
  contrast: 1,
  warmth: 0
};
let mutationObserver = null;
let elementColorMap = new WeakMap(); // Store original colors

/**
 * Initialize theme for the current page
 */
async function initializeTheme() {
  const domain = getDomain();
  const settings = await chrome.storage.local.get(domain);
  
  if (settings[domain]) {
    currentSettings = { ...currentSettings, ...settings[domain] };
    
    if (currentSettings.enabled) {
      applyTheme();
    }
  }
}

/**
 * Get domain from current URL
 */
function getDomain() {
  try {
    return new URL(window.location.href).hostname;
  } catch {
    return window.location.host;
  }
}

/**
 * Apply dark theme to all elements
 */
function applyTheme() {
  if (!currentSettings.enabled) {
    return;
  }

  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  let node;
  const processed = new Set();

  while (node = walker.nextNode()) {
    if (processed.has(node)) continue;
    processed.add(node);

    const analysis = analyzer.analyzeElement(node);

    if (analysis.shouldPreserve) {
      // Skip media elements entirely
      continue;
    }

    if (analysis.shouldInvert) {
      transformElement(node);
    }
  }

  // Start observing for new content
  startMutationObserver();
}

/**
 * Re-apply theme with updated settings (when sliders change)
 */
function updateThemeWithNewSettings() {
  if (!currentSettings.enabled) {
    return;
  }

  // Iterate through all elements and reapply colors with new settings
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(element => {
    const colorData = elementColorMap.get(element);
    
    if (colorData) {
      try {
        // Recompute colors with new settings
        if (colorData.originalColor && colorData.originalColor !== 'rgba(0, 0, 0, 0)') {
          const newColor = analyzer.invertForDarkTheme(colorData.originalColor, currentSettings);
          element.style.color = newColor;
        }
        
        if (colorData.originalBg && colorData.originalBg !== 'rgba(0, 0, 0, 0)' && !analyzer.isMediaElement(element)) {
          const newBgColor = analyzer.invertForDarkTheme(colorData.originalBg, currentSettings);
          element.style.backgroundColor = newBgColor;
        }
        
        if (colorData.originalBorder && colorData.originalBorder !== 'rgba(0, 0, 0, 0)') {
          const newBorderColor = analyzer.invertForDarkTheme(colorData.originalBorder, currentSettings);
          element.style.borderColor = newBorderColor;
        }
      } catch (e) {
        // Skip if error
      }
    }
  });
}

/**
 * Transform an individual element
 */
function transformElement(element) {
  try {
    const style = window.getComputedStyle(element);
    
    // Store original colors if not already stored
    let colorData = elementColorMap.get(element);
    if (!colorData) {
      colorData = {
        originalColor: style.color,
        originalBg: style.backgroundColor,
        originalBorder: style.borderColor
      };
      elementColorMap.set(element, colorData);
    }

    // Transform text color
    if (colorData.originalColor && colorData.originalColor !== 'rgba(0, 0, 0, 0)') {
      const newColor = analyzer.invertForDarkTheme(colorData.originalColor, currentSettings);
      element.style.color = newColor;
    }

    // Transform background color (skip if it's a media element)
    if (colorData.originalBg && colorData.originalBg !== 'rgba(0, 0, 0, 0)' && !analyzer.isMediaElement(element)) {
      const newBgColor = analyzer.invertForDarkTheme(colorData.originalBg, currentSettings);
      element.style.backgroundColor = newBgColor;
    }

    // Transform border colors
    if (colorData.originalBorder && colorData.originalBorder !== 'rgba(0, 0, 0, 0)') {
      const newBorderColor = analyzer.invertForDarkTheme(colorData.originalBorder, currentSettings);
      element.style.borderColor = newBorderColor;
    }

  } catch (e) {
    console.warn('Error transforming element:', e);
  }
}

/**
 * Transform box shadow colors
 */
function transformBoxShadow(shadowString) {
  // This is a simplified version - full parsing is complex
  // In production, consider using a shadow parser library
  return shadowString;
}

/**
 * Start observing DOM for new content
 */
function startMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    const processed = new Set();

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && !processed.has(node)) { // Element node
            processed.add(node);
            
            const analysis = analyzer.analyzeElement(node);
            if (analysis.shouldInvert && !analysis.shouldPreserve) {
              transformElement(node);
              
              // Also transform children
              const children = node.querySelectorAll('*');
              children.forEach(child => {
                if (!processed.has(child)) {
                  processed.add(child);
                  const childAnalysis = analyzer.analyzeElement(child);
                  if (childAnalysis.shouldInvert && !childAnalysis.shouldPreserve) {
                    transformElement(child);
                  }
                }
              });
            }
          }
        });
      }

      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const node = mutation.target;
        if (!processed.has(node)) {
          processed.add(node);
          const analysis = analyzer.analyzeElement(node);
          if (analysis.shouldInvert && !analysis.shouldPreserve) {
            transformElement(node);
          }
        }
      }
    });
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: false
  });
}

/**
 * Remove dark theme
 */
function removeTheme() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  // Reload page to restore original styles
  location.reload();
}

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTheme') {
    currentSettings = request.settings;
    
    if (currentSettings.enabled) {
      applyTheme();
    } else {
      removeTheme();
    }
    
    sendResponse({ success: true });
  }

  if (request.action === 'updateSettings') {
    currentSettings = request.settings;
    
    if (currentSettings.enabled) {
      // Re-apply theme with new brightness/contrast/warmth values
      updateThemeWithNewSettings();
    }
    
    sendResponse({ success: true });
  }

  if (request.action === 'getStatus') {
    sendResponse({ settings: currentSettings });
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
  initializeTheme();
}
