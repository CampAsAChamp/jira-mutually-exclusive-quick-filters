// Popup script for Jira Exclusive Quick Filters extension

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('mutuallyExclusiveToggle');
  const statusElement = document.getElementById('status');
  const descriptionElement = document.querySelector('.description');

  // Load the current state from storage
  const result = await chrome.storage.sync.get({ mutuallyExclusive: true });
  toggle.checked = result.mutuallyExclusive;
  
  // Update description border on load
  updateDescriptionBorder(result.mutuallyExclusive);

  console.log('Popup loaded, mutuallyExclusive:', result.mutuallyExclusive);
  
  // Function to update description border
  function updateDescriptionBorder(isEnabled) {
    if (isEnabled) {
      descriptionElement.className = 'description enabled';
    } else {
      descriptionElement.className = 'description disabled';
    }
  }

  // Show status message
  function showStatus(message, type = 'success') {
    statusElement.textContent = message;
    statusElement.className = `status show ${type}`;
    
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
    
    // Update description border
    updateDescriptionBorder(isEnabled);
    
    // Show status message
    if (isEnabled) {
      showStatus('✓ Exclusive filters enabled', 'success');
    } else {
      showStatus('↺ Normal filter behavior restored', 'warning');
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
