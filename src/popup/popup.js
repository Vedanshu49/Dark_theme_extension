/**
 * Popup Script
 * Handles UI interaction and settings persistence
 */

// DOM Elements
const masterToggle = document.getElementById('masterToggle');
const sliderContainer = document.getElementById('sliderContainer');
const actionGroup = document.getElementById('actionGroup');
const brightnessSlider = document.getElementById('brightnessSlider');
const contrastSlider = document.getElementById('contrastSlider');
const warmthSlider = document.getElementById('warmthSlider');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const warmthValue = document.getElementById('warmthValue');
const siteInfo = document.getElementById('siteInfo');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');

let currentDomain = '';
let currentSettings = {
  enabled: false,
  brightness: 1,
  contrast: 1,
  warmth: 0
};

/**
 * Initialize popup on load
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentDomain = await getCurrentDomain();
    await loadSettings();
    setupEventListeners();
  } catch (error) {
    console.warn('Error initializing popup:', error);
    siteInfo.innerHTML = '⚠ Unable to load on this page';
  }
});

/**
 * Get current domain from active tab
 */
async function getCurrentDomain() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0].url;
  
  try {
    return new URL(url).hostname;
  } catch {
    return new URL(url).host;
  }
}

/**
 * Load settings for current site from storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getSiteSettings', domain: currentDomain },
      (response) => {
        if (response && response.settings) {
          currentSettings = response.settings;
        } else {
          // Use default values for new site
          currentSettings = {
            enabled: false,
            brightness: 1,
            contrast: 1,
            warmth: 0
          };
        }

        updateUI();
        resolve();
      }
    );
  });
}

/**
 * Update UI to reflect current settings
 */
function updateUI() {
  masterToggle.checked = currentSettings.enabled;
  brightnessSlider.value = currentSettings.brightness;
  contrastSlider.value = currentSettings.contrast;
  warmthSlider.value = currentSettings.warmth;

  updateSliderValues();
  updateSiteInfo();
  toggleControlsVisibility();
}

/**
 * Update displayed slider values
 */
function updateSliderValues() {
  brightnessValue.textContent = Math.round(currentSettings.brightness * 100) + '%';
  contrastValue.textContent = Math.round(currentSettings.contrast * 100) + '%';
  warmthValue.textContent = Math.round(currentSettings.warmth * 100) + '%';
}

/**
 * Update site information text
 */
function updateSiteInfo() {
  const statusText = currentSettings.enabled ? '✓ Active' : '✗ Inactive';
  const statusClass = currentSettings.enabled ? 'active' : 'inactive';
  siteInfo.innerHTML = `Theme is <strong>${statusText}</strong> for <code>${currentDomain}</code>`;
}

/**
 * Toggle visibility of sliders and buttons
 */
function toggleControlsVisibility() {
  if (currentSettings.enabled) {
    sliderContainer.style.display = 'block';
    actionGroup.style.display = 'flex';
  } else {
    sliderContainer.style.display = 'none';
    actionGroup.style.display = 'none';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  masterToggle.addEventListener('change', handleToggleChange);
  brightnessSlider.addEventListener('input', handleBrightnessChange);
  contrastSlider.addEventListener('input', handleContrastChange);
  warmthSlider.addEventListener('input', handleWarmthChange);
  resetBtn.addEventListener('click', handleReset);
}

/**
 * Handle master toggle change
 */
async function handleToggleChange() {
  currentSettings.enabled = masterToggle.checked;
  
  await saveSettings();
  await applySettingsToTab();
  
  toggleControlsVisibility();
  showStatus(`Theme ${currentSettings.enabled ? 'enabled' : 'disabled'}`, 'success');
}

/**
 * Handle brightness slider change
 */
async function handleBrightnessChange() {
  currentSettings.brightness = parseFloat(brightnessSlider.value);
  updateSliderValues();
  
  await saveSettings();
  await applySettingsToTab();
}

/**
 * Handle contrast slider change
 */
async function handleContrastChange() {
  currentSettings.contrast = parseFloat(contrastSlider.value);
  updateSliderValues();
  
  await saveSettings();
  await applySettingsToTab();
}

/**
 * Handle warmth slider change
 */
async function handleWarmthChange() {
  currentSettings.warmth = parseFloat(warmthSlider.value);
  updateSliderValues();
  
  await saveSettings();
  await applySettingsToTab();
}

/**
 * Handle reset to defaults
 */
async function handleReset() {
  currentSettings = {
    enabled: currentSettings.enabled,
    brightness: 1,
    contrast: 1,
    warmth: 0
  };

  updateUI();
  await saveSettings();
  await applySettingsToTab();
  
  showStatus('Reset to defaults', 'success');
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'saveSiteSettings',
          domain: currentDomain,
          settings: currentSettings
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Save settings error:', chrome.runtime.lastError);
          }
          resolve();
        }
      );
    } catch (error) {
      console.warn('Could not save settings:', error);
      resolve();
    }
  });
}

/**
 * Apply settings to the current tab
 */
async function applySettingsToTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0].id;

  try {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: 'updateSettings',
        settings: currentSettings
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // Content script not available on this page (e.g., extension pages, chrome://, etc.)
          console.log('Content script not available on this page');
        }
      }
    );
  } catch (error) {
    console.warn('Could not send message to content script:', error);
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 2000);
}
