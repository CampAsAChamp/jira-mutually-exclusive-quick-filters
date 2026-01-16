// Popup script for Jira Exclusive Quick Filters extension

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('mutuallyExclusiveToggle');
  const toastElement = document.getElementById('toast');
  const customUrlInput = document.getElementById('customUrlInput');
  const addUrlButton = document.getElementById('addUrlButton');
  const customUrlsList = document.getElementById('customUrlsList');
  const noUrlsMessage = document.getElementById('noUrlsMessage');
  const urlValidationError = document.getElementById('urlValidationError');

  // Load the current state from storage
  const result = await chrome.storage.sync.get({
    mutuallyExclusive: true,
    customJiraUrls: []
  });
  toggle.checked = result.mutuallyExclusive;

  console.log('Popup loaded, mutuallyExclusive:', result.mutuallyExclusive);
  console.log('Custom Jira URLs:', result.customJiraUrls);

  // Display custom URLs
  displayCustomUrls(result.customJiraUrls);
  
  // Show status message as toast
  function showStatus(message, type = 'success') {
    toastElement.textContent = message;
    toastElement.className = `toast show ${type}`;
    
    setTimeout(() => {
      toastElement.classList.remove('show');
    }, 2000);
  }

  // Validate URL format
  function isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      // Must be http or https
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  // Normalize URL (remove trailing slash, convert to pattern)
  function normalizeUrl(urlString) {
    try {
      const url = new URL(urlString);
      // Return base URL with wildcard path
      return `${url.protocol}//${url.host}/*`;
    } catch (e) {
      return urlString;
    }
  }

  // Display custom URLs in the list
  function displayCustomUrls(urls) {
    customUrlsList.innerHTML = '';

    if (urls.length === 0) {
      noUrlsMessage.classList.remove('hidden');
    } else {
      noUrlsMessage.classList.add('hidden');

      urls.forEach((url, index) => {
        const li = document.createElement('li');
        li.className = 'url-item';

        const urlText = document.createElement('span');
        urlText.className = 'url-text';
        urlText.textContent = url;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-url-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeCustomUrl(index));

        li.appendChild(urlText);
        li.appendChild(removeButton);
        customUrlsList.appendChild(li);
      });
    }
  }

  // Add custom URL
  async function addCustomUrl() {
    const urlInput = customUrlInput.value.trim();

    // Clear previous error
    urlValidationError.textContent = '';
    customUrlInput.classList.remove('error');

    if (!urlInput) {
      urlValidationError.textContent = 'Please enter a URL';
      customUrlInput.classList.add('error');
      return;
    }

    if (!isValidUrl(urlInput)) {
      urlValidationError.textContent = 'Invalid URL format. Must start with http:// or https://';
      customUrlInput.classList.add('error');
      return;
    }

    const normalizedUrl = normalizeUrl(urlInput);
    const result = await chrome.storage.sync.get({ customJiraUrls: [] });
    const urls = result.customJiraUrls;

    // Check for duplicates
    if (urls.includes(normalizedUrl)) {
      urlValidationError.textContent = 'This URL is already configured';
      customUrlInput.classList.add('error');
      return;
    }

    // Request permission for this URL
    try {
      const granted = await chrome.permissions.request({
        origins: [normalizedUrl]
      });

      if (!granted) {
        urlValidationError.textContent = 'Permission denied. Please try again.';
        customUrlInput.classList.add('error');
        return;
      }

      // Add URL to storage
      urls.push(normalizedUrl);
      await chrome.storage.sync.set({ customJiraUrls: urls });

      // Update display
      displayCustomUrls(urls);
      customUrlInput.value = '';
      showStatus('✓ Custom URL added', 'success');

      console.log('Added custom URL:', normalizedUrl);
    } catch (error) {
      console.error('Error requesting permission:', error);
      urlValidationError.textContent = 'Failed to add URL. Please try again.';
      customUrlInput.classList.add('error');
    }
  }

  // Remove custom URL
  async function removeCustomUrl(index) {
    const result = await chrome.storage.sync.get({ customJiraUrls: [] });
    const urls = result.customJiraUrls;
    const removedUrl = urls[index];

    // Remove from array
    urls.splice(index, 1);
    await chrome.storage.sync.set({ customJiraUrls: urls });

    // Update display
    displayCustomUrls(urls);
    showStatus('✓ URL removed', 'success');

    console.log('Removed custom URL:', removedUrl);

    // Optionally remove permission (note: this removes it completely)
    try {
      await chrome.permissions.remove({ origins: [removedUrl] });
    } catch (error) {
      console.warn('Could not remove permission:', error);
    }
  }

  // Get all Jira URL patterns for tab queries
  function getAllJiraPatterns() {
    // Built-in patterns from manifest (only Atlassian Cloud auto-supported)
    const builtInPatterns = [
      '*://*.atlassian.net/*'
    ];
    return builtInPatterns;
  }

  // Add URL button click handler
  addUrlButton.addEventListener('click', addCustomUrl);

  // Allow Enter key to add URL
  customUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomUrl();
    }
  });

  // Listen for toggle changes
  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    
    // Save to storage
    await chrome.storage.sync.set({ mutuallyExclusive: isEnabled });
    
    console.log('Toggle changed, mutuallyExclusive:', isEnabled);
    
    // Show status message as toast
    if (isEnabled) {
      showStatus('✓ Exclusive filters enabled', 'success');
    } else {
      showStatus('↺ Normal filter behavior restored', 'warning');
    }

    // Notify all tabs with Jira pages to reload the content script behavior
    // Query both built-in patterns and custom URLs
    const patterns = getAllJiraPatterns();
    const customResult = await chrome.storage.sync.get({ customJiraUrls: [] });
    const allPatterns = [...patterns, ...customResult.customJiraUrls];

    for (const pattern of allPatterns) {
      try {
        const tabs = await chrome.tabs.query({ url: pattern });
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleChanged',
            enabled: isEnabled
          }).catch(() => {
            // Ignore errors for tabs where content script isn't loaded yet
          });
        });
      } catch (error) {
        console.warn('Could not query tabs for pattern:', pattern, error);
      }
    }
  });
});
