// Background service worker for Jira Mutually Exclusive Quick Filters extension

console.log('Jira Mutually Exclusive Quick Filters: Background service worker started');

// Constants
const BUILT_IN_PATTERNS = ['*://*.atlassian.net/*'];
const CONTENT_SCRIPT_FILE = 'content.js';

// Helper: Get all URL patterns (built-in + custom)
async function getAllUrlPatterns() {
  const result = await chrome.storage.sync.get({ customJiraUrls: [] });
  return [...BUILT_IN_PATTERNS, ...result.customJiraUrls];
}

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

// Main function: Inject content script into tabs matching URL patterns
async function injectContentScriptIntoMatchingTabs(patterns) {
  console.log('Injecting content scripts for patterns:', patterns);
  
  for (const pattern of patterns) {
    try {
      const tabs = await chrome.tabs.query({ url: pattern });
      await Promise.all(tabs.map(processTab));
    } catch (error) {
      console.warn(`Error processing pattern ${pattern}:`, error);
    }
  }
}

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Jira Mutually Exclusive Quick Filters: Extension installed/updated', details.reason);
  
  if (details.reason === 'install') {
    // Set default values on first install
    await chrome.storage.sync.set({ 
      mutuallyExclusive: true,
      customJiraUrls: [],
      welcomeShown: false
    });
    console.log('Jira Mutually Exclusive Quick Filters: Default settings initialized');
    
    // Open welcome page on first install
    chrome.tabs.create({ url: 'welcome.html' });
  }
  
  // On install or update, inject content script into existing Jira tabs
  if (details.reason === 'install' || details.reason === 'update') {
    const patterns = await getAllUrlPatterns();
    await injectContentScriptIntoMatchingTabs(patterns);
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

// Helper: Convert URL pattern to regex
function patternToRegex(pattern) {
  const escaped = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
  return new RegExp(`^${escaped}$`);
}

// Helper: Check if URL matches any pattern
function matchesAnyPattern(url, patterns) {
  return patterns.some(pattern => patternToRegex(pattern).test(url));
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
  
  // Handle custom URL changes
  if (changes.customJiraUrls) {
    const oldUrls = changes.customJiraUrls.oldValue || [];
    const newUrls = changes.customJiraUrls.newValue || [];
    
    console.log('Custom URLs changed from', oldUrls, 'to', newUrls);
    
    // Inject content script into tabs with new URLs
    await injectContentScriptIntoMatchingTabs(newUrls);
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
  
  const patterns = await getAllUrlPatterns();
  
  // Check if the tab URL matches any pattern
  if (matchesAnyPattern(tab.url, patterns)) {
    const isActive = await isContentScriptActive(tabId);
    
    if (!isActive) {
      console.log(`Auto-injecting content script into new tab ${tabId} (${tab.url})`);
      await injectContentScript(tabId, tab.url);
    }
  }
});
