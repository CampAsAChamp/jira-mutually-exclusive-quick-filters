// Welcome page script for Jira Mutually Exclusive Quick Filters extension

document.addEventListener('DOMContentLoaded', async () => {
  const jiraUrlInput = document.getElementById('jiraUrlInput');
  const addUrlButton = document.getElementById('addUrlButton');
  const urlValidationError = document.getElementById('urlValidationError');
  const successMessage = document.getElementById('successMessage');
  const skipButton = document.getElementById('skipButton');
  const getStartedButton = document.getElementById('getStartedButton');

  let urlAdded = false;

  // Mark welcome as shown
  await chrome.storage.sync.set({ welcomeShown: true });

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

  // Show error message
  function showError(message) {
    urlValidationError.textContent = message;
    jiraUrlInput.classList.add('error');
    successMessage.classList.add('hidden');
  }

  // Clear error message
  function clearError() {
    urlValidationError.textContent = '';
    jiraUrlInput.classList.remove('error');
  }

  // Show success message
  function showSuccess() {
    successMessage.classList.remove('hidden');
    clearError();
    urlAdded = true;
  }

  // Add custom URL
  // TODO: Known issue - when permission dialog appears, may require clicking "Add URL" twice.
  // See popup.js for detailed explanation and potential solutions.
  async function addCustomUrl() {
    const urlInput = jiraUrlInput.value.trim();

    // Clear previous error
    clearError();

    if (!urlInput) {
      showError('Please enter a URL');
      return;
    }

    if (!isValidUrl(urlInput)) {
      showError('Invalid URL format. Must start with http:// or https://');
      return;
    }

    const normalizedUrl = normalizeUrl(urlInput);

    // Disable button while processing
    addUrlButton.disabled = true;
    addUrlButton.textContent = 'Adding...';

    try {
      // Get current URLs and check for duplicates
      const result = await chrome.storage.sync.get({ customJiraUrls: [] });
      const urls = result.customJiraUrls;

      if (urls.includes(normalizedUrl)) {
        showError('This URL is already configured');
        addUrlButton.disabled = false;
        addUrlButton.textContent = 'Add URL';
        return;
      }

      // Check if we already have permission
      const hasPermission = await chrome.permissions.contains({
        origins: [normalizedUrl]
      });

      if (!hasPermission) {
        // Request permission
        const granted = await chrome.permissions.request({
          origins: [normalizedUrl]
        });

        if (!granted) {
          showError('Permission denied. Please try again.');
          addUrlButton.disabled = false;
          addUrlButton.textContent = 'Add URL';
          return;
        }
      }

      // Add URL to storage
      urls.push(normalizedUrl);
      await chrome.storage.sync.set({ customJiraUrls: urls });

      // Show success
      showSuccess();
      jiraUrlInput.value = '';
      addUrlButton.textContent = 'Add URL';
      addUrlButton.disabled = false;

      console.log('Added custom URL:', normalizedUrl);
    } catch (error) {
      console.error('Error adding URL:', error);
      showError('Failed to add URL. Please try again.');
      addUrlButton.disabled = false;
      addUrlButton.textContent = 'Add URL';
    }
  }

  // Add URL button click handler
  addUrlButton.addEventListener('click', addCustomUrl);

  // Allow Enter key to add URL
  jiraUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomUrl();
    }
  });

  // Clear error on input
  jiraUrlInput.addEventListener('input', () => {
    if (urlValidationError.textContent) {
      clearError();
    }
  });

  // Skip button - close the tab
  skipButton.addEventListener('click', () => {
    window.close();
  });

  // Get Started button - close the tab (or could redirect to a Jira tab)
  getStartedButton.addEventListener('click', () => {
    window.close();
  });
});
