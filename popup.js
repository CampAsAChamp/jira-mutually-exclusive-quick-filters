// Popup script for Jira Exclusive Quick Filters extension

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('mutuallyExclusiveToggle');
  const statusElement = document.getElementById('status');

  // Load the current state from storage
  const result = await chrome.storage.sync.get({ mutuallyExclusive: true });
  toggle.checked = result.mutuallyExclusive;

  console.log('Popup loaded, mutuallyExclusive:', result.mutuallyExclusive);

  // Show status message
  function showStatus(message, isSuccess = true) {
    statusElement.textContent = message;
    statusElement.className = `status show ${isSuccess ? 'success' : 'error'}`;
    
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 2000);
  }

  // Listen for toggle changes
  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    
    // Save to storage
    await chrome.storage.sync.set({ mutuallyExclusive: isEnabled });
    
    console.log('Toggle changed, mutuallyExclusive:', isEnabled);
    
    // Show status message
    if (isEnabled) {
      showStatus('✓ Exclusive filters enabled');
    } else {
      showStatus('✓ Normal filter behavior restored');
    }

    // Notify all tabs with Jira pages to reload the content script behavior
    const tabs = await chrome.tabs.query({ url: '*://*.atlassian.net/*' });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleChanged', 
        enabled: isEnabled 
      }).catch(() => {
        // Ignore errors for tabs where content script isn't loaded yet
      });
    });
  });
});
