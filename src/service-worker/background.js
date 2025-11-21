/**
 * Background Service Worker (Manifest V3)
 * Handles storage, context, and inter-script communication
 */

// Initialize storage structure on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smart Dark Theme extension installed');
  
  // Initialize default settings in storage
  chrome.storage.local.get(null, (items) => {
    if (Object.keys(items).length === 0) {
      chrome.storage.local.set({
        'globalSettings': {
          defaultBrightness: 1,
          defaultContrast: 1,
          defaultWarmth: 0
        }
      });
    }
  });
});

// Handle messages from content and popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSiteSettings') {
    const domain = request.domain;
    const settings = request.settings;
    
    chrome.storage.local.set({
      [domain]: settings
    }, () => {
      console.log(`Settings saved for ${domain}:`, settings);
      sendResponse({ success: true });
    });

    return true; // Keep channel open for async response
  }

  if (request.action === 'getSiteSettings') {
    const domain = request.domain;
    
    chrome.storage.local.get(domain, (items) => {
      sendResponse({ settings: items[domain] || null });
    });

    return true; // Keep channel open for async response
  }

  if (request.action === 'getAllSites') {
    chrome.storage.local.get(null, (items) => {
      const sites = {};
      Object.keys(items).forEach(key => {
        if (key !== 'globalSettings' && items[key] && items[key].enabled) {
          sites[key] = items[key];
        }
      });
      sendResponse({ sites });
    });

    return true; // Keep channel open for async response
  }
});

