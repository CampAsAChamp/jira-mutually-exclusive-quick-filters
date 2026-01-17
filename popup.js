// Popup script for Jira Exclusive Quick Filters extension

// Constants
const BUILT_IN_PATTERNS = ['*://*.atlassian.net/*'];
const DEFAULT_SETTINGS = {
  mutuallyExclusive: true,
  customJiraUrls: []
};

document.addEventListener('DOMContentLoaded', async () => {
  // DOM element references
  const elements = {
    toggle: document.getElementById('mutuallyExclusiveToggle'),
    toast: document.getElementById('toast'),
    urlInput: document.getElementById('customUrlInput'),
    addUrlButton: document.getElementById('addUrlButton'),
    urlsList: document.getElementById('customUrlsList'),
    noUrlsMessage: document.getElementById('noUrlsMessage'),
    urlValidationError: document.getElementById('urlValidationError')
  };

  // Load the current state from storage
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  elements.toggle.checked = settings.mutuallyExclusive;

  console.log('Popup loaded, mutuallyExclusive:', settings.mutuallyExclusive);
  console.log('Custom Jira URLs:', settings.customJiraUrls);

  // Display custom URLs
  displayCustomUrls(settings.customJiraUrls);

  // Helper: Show status message as toast
  function showStatus(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast show ${type}`;

    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2000);
  }

  // Helper: Validate URL format
  function isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Helper: Normalize URL (convert to pattern)
  function normalizeUrl(urlString) {
    try {
      const url = new URL(urlString);
      return `${url.protocol}//${url.host}/*`;
    } catch {
      return urlString;
    }
  }

  // Helper: Show/hide validation error
  function showValidationError(message) {
    elements.urlValidationError.textContent = message;
    elements.urlInput.classList.add('error');
  }

  function clearValidationError() {
    elements.urlValidationError.textContent = '';
    elements.urlInput.classList.remove('error');
  }

  // Helper: Create URL list item
  function createUrlListItem(url, index) {
    const li = document.createElement('li');
    li.className = 'url-item';

    const urlText = document.createElement('span');
    urlText.className = 'url-text';
    urlText.textContent = url;

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-url-button icon-button';
    removeButton.textContent = '×';
    removeButton.title = 'Remove URL';
    removeButton.addEventListener('click', () => removeCustomUrl(index));

    li.appendChild(urlText);
    li.appendChild(removeButton);
    return li;
  }

  // Display custom URLs in the list
  function displayCustomUrls(urls) {
    elements.urlsList.innerHTML = '';

    if (urls.length === 0) {
      elements.noUrlsMessage.classList.remove('hidden');
    } else {
      elements.noUrlsMessage.classList.add('hidden');
      urls.forEach((url, index) => {
        elements.urlsList.appendChild(createUrlListItem(url, index));
      });
    }
  }

  // Helper: Request permission for URL
  async function requestPermissionForUrl(normalizedUrl) {
    const hasPermission = await chrome.permissions.contains({
      origins: [normalizedUrl]
    });

    if (hasPermission) return true;

    // Request permission - popup will likely close during this
    const granted = await chrome.permissions.request({
      origins: [normalizedUrl]
    });

    return granted;
  }

  // Add custom URL
  // TODO: Known issue - popup closes when permission dialog appears, requiring user to click "Add URL" twice.
  // First click: shows permission dialog, user grants permission, popup closes.
  // Second click: permission already exists, URL is saved successfully.
  // This is a Chrome limitation - popups close when permission dialogs appear.
  // Potential solutions to explore:
  // 1. Use chrome.windows.create() for a persistent window instead of popup
  // 2. Implement pending URL tracking with auto-completion (attempted but introduced bugs)
  // 3. Show user instruction: "After granting permission, click Add URL again"
  async function addCustomUrl() {
    const urlInput = elements.urlInput.value.trim();

    clearValidationError();

    // Validation
    if (!urlInput) {
      showValidationError('Please enter a URL');
      return;
    }

    if (!isValidUrl(urlInput)) {
      showValidationError('Invalid URL format. Must start with http:// or https://');
      return;
    }

    const normalizedUrl = normalizeUrl(urlInput);
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const urls = settings.customJiraUrls;

    if (urls.includes(normalizedUrl)) {
      showValidationError('This URL is already configured');
      return;
    }

    try {
      const granted = await requestPermissionForUrl(normalizedUrl);

      if (!granted) {
        showValidationError('Permission denied. Please try again.');
        return;
      }

      // Add URL to storage
      urls.push(normalizedUrl);
      await chrome.storage.sync.set({ customJiraUrls: urls });

      // Update display
      displayCustomUrls(urls);
      elements.urlInput.value = '';
      showStatus('✓ Custom URL added', 'success');

      console.log('Added custom URL:', normalizedUrl);
    } catch (error) {
      console.error('Error adding URL:', error);
      showValidationError('Failed to add URL. Please try again.');
    }
  }

  // Remove custom URL
  async function removeCustomUrl(index) {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const urls = settings.customJiraUrls;
    const removedUrl = urls[index];

    // Remove from array
    urls.splice(index, 1);
    await chrome.storage.sync.set({ customJiraUrls: urls });

    // Update display
    displayCustomUrls(urls);
    showStatus('✓ URL removed', 'success');

    console.log('Removed custom URL:', removedUrl);

    // Optionally remove permission
    try {
      await chrome.permissions.remove({ origins: [removedUrl] });
    } catch (error) {
      console.warn('Could not remove permission:', error);
    }
  }

  // Helper: Get all Jira URL patterns
  async function getAllJiraPatterns() {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return [...BUILT_IN_PATTERNS, ...settings.customJiraUrls];
  }

  // Helper: Notify all Jira tabs about toggle change
  async function notifyAllJiraTabs(isEnabled) {
    const allPatterns = await getAllJiraPatterns();

    for (const pattern of allPatterns) {
      try {
        const tabs = await chrome.tabs.query({ url: pattern });

        // Send messages in parallel, ignore failures
        await Promise.allSettled(
          tabs.map(tab =>
            chrome.tabs.sendMessage(tab.id, {
              action: 'toggleChanged',
              enabled: isEnabled
            })
          )
        );
      } catch (error) {
        console.warn('Could not query tabs for pattern:', pattern, error);
      }
    }
  }

  // Event: Add URL button click handler
  elements.addUrlButton.addEventListener('click', addCustomUrl);

  // Event: Allow Enter key to add URL
  elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomUrl();
    }
  });

  // Event: Listen for toggle changes
  elements.toggle.addEventListener('change', async () => {
    const isEnabled = elements.toggle.checked;

    // Save to storage
    await chrome.storage.sync.set({ mutuallyExclusive: isEnabled });

    console.log('Toggle changed, mutuallyExclusive:', isEnabled);

    // Show status message
    const message = isEnabled
      ? '✓ Exclusive filters enabled'
      : '↺ Normal filter behavior restored';
    const type = isEnabled ? 'success' : 'warning';
    showStatus(message, type);

    // Notify all Jira tabs about the change
    await notifyAllJiraTabs(isEnabled);
  });
});
