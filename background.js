// Background service worker for Jira Exclusive Quick Filters extension

console.log('Jira Exclusive Quick Filters: Background service worker started');

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Jira Exclusive Quick Filters: Extension installed/updated', details.reason);
  
  if (details.reason === 'install') {
    // Set default values on first install
    chrome.storage.sync.set({ mutuallyExclusive: true }, () => {
      console.log('Jira Exclusive Quick Filters: Default settings initialized (mutuallyExclusive: true)');
    });
  }
});

// Listen for storage changes and log them
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.mutuallyExclusive) {
    const oldValue = changes.mutuallyExclusive.oldValue;
    const newValue = changes.mutuallyExclusive.newValue;
    console.log(`Jira Exclusive Quick Filters: Setting changed from ${oldValue} to ${newValue}`);
  }
});

// Optional: Update badge based on enabled state
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.mutuallyExclusive) {
    const isEnabled = changes.mutuallyExclusive.newValue;
    
    if (isEnabled) {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#999999' });
    }
  }
});

// Set initial badge state
chrome.storage.sync.get({ mutuallyExclusive: true }, (result) => {
  if (!result.mutuallyExclusive) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999999' });
  }
});
