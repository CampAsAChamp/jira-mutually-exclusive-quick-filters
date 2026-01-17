// Background service worker for Jira Mutually Exclusive Quick Filters extension

// Constants
const CONTENT_SCRIPT_FILE = 'content.js';

// Helper: Check if content script is active in a tab
async function isContentScriptActive(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch {
    return false;
  }
}

// Helper: Inject content script into a tab
async function injectContentScript(tabId, tabUrl) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE]
    });
    return true;
  } catch (error) {
    console.warn(`Failed to inject content script into tab ${tabId}:`, error);
    return false;
  }
}

// Helper: Process a single tab (check if script is active, inject if needed)
async function processTab(tab) {
  const isActive = await isContentScriptActive(tab.id);
  
  if (isActive) {
    return false;
  }
  
  return await injectContentScript(tab.id, tab.url);
}

// Main function: Inject content script into matching Jira tabs
async function injectContentScriptIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(processTab));
  } catch (error) {
    console.warn('Error injecting content scripts:', error);
  }
}

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default values on first install
    await chrome.storage.sync.set({ 
      mutuallyExclusive: true
    });
  }
  
  // On install or update, inject content script into existing Jira tabs
  if (details.reason === 'install' || details.reason === 'update') {
    await injectContentScriptIntoAllTabs();
  }
});

// Helper: Update badge based on enabled state
function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999999' });
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'sync') return;
  
  // Handle mutuallyExclusive toggle changes
  if (changes.mutuallyExclusive) {
    const { newValue } = changes.mutuallyExclusive;
    updateBadge(newValue);
  }
});

// Set initial badge state
chrome.storage.sync.get({ mutuallyExclusive: true }, (result) => {
  updateBadge(result.mutuallyExclusive);
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only proceed when the page has finished loading
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const isActive = await isContentScriptActive(tabId);

  if (!isActive) {
    await injectContentScript(tabId, tab.url);
  }
});
