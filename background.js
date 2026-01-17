// Background service worker for Jira Mutually Exclusive Quick Filters extension

console.log('Jira Mutually Exclusive Quick Filters: Background service worker started');

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
    console.log(`Injected content script into tab ${tabId} (${tabUrl})`);
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
    console.log(`Content script already active in tab ${tab.id}`);
    return false;
  }
  
  return await injectContentScript(tab.id, tab.url);
}

// Main function: Inject content script into all tabs
async function injectContentScriptIntoAllTabs() {
  console.log('Injecting content scripts into all tabs');

  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(processTab));
  } catch (error) {
    console.warn('Error injecting content scripts:', error);
  }
}

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Jira Mutually Exclusive Quick Filters: Extension installed/updated', details.reason);
  
  if (details.reason === 'install') {
    // Set default values on first install
    await chrome.storage.sync.set({ 
      mutuallyExclusive: true
    });
    console.log('Jira Mutually Exclusive Quick Filters: Default settings initialized');
  }
  
  // On install or update, inject content script into existing tabs
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
    const { oldValue, newValue } = changes.mutuallyExclusive;
    console.log(`Jira Exclusive Quick Filters: Setting changed from ${oldValue} to ${newValue}`);
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
    console.log(`Auto-injecting content script into tab ${tabId} (${tab.url})`);
    await injectContentScript(tabId, tab.url);
  }
});
