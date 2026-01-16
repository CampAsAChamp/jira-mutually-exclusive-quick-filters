// Jira Exclusive Filters - Content Script
// Makes quick filters mutually exclusive by auto-deselecting others when one is clicked

console.log('Jira Exclusive Filters: Content script loaded');

// Flag to prevent recursive clicking
let isProcessingClick = false;

// Initialize the extension once the quick filters are loaded
function initializeExtension() {
  console.log('Jira Exclusive Filters: Initializing extension');
  
  const filterContainer = document.querySelector('dl#js-work-quickfilters');
  if (!filterContainer) {
    console.log('Jira Exclusive Filters: Filter container not found');
    return;
  }

  // Get all filter buttons
  const filterButtons = document.querySelectorAll('.js-quickfilter-button');
  console.log(`Jira Exclusive Filters: Found ${filterButtons.length} filter buttons`);

  if (filterButtons.length === 0) {
    console.log('Jira Exclusive Filters: No filter buttons found');
    return;
  }

  // Add click event listeners to all filter buttons
  filterButtons.forEach((button, index) => {
    const filterId = button.getAttribute('data-filter-id');
    const filterName = button.textContent.trim();
    console.log(`Jira Exclusive Filters: Setting up listener for filter ${index + 1}: "${filterName}" (ID: ${filterId})`);

    button.addEventListener('click', async (e) => {
      // Prevent recursive clicking
      if (isProcessingClick) {
        console.log('Jira Exclusive Filters: Already processing a click, skipping');
        return;
      }

      // Check if the mutually exclusive feature is enabled
      const result = await chrome.storage.sync.get({ mutuallyExclusive: true });
      const isEnabled = result.mutuallyExclusive;

      console.log(`Jira Exclusive Filters: Feature enabled: ${isEnabled}`);

      if (!isEnabled) {
        console.log('Jira Exclusive Filters: Feature disabled, allowing normal behavior');
        return;
      }

      isProcessingClick = true;

      // Small delay to let the current click register first
      setTimeout(() => {
        const clickedFilterId = button.getAttribute('data-filter-id');
        const clickedFilterName = button.textContent.trim();
        console.log(`Jira Exclusive Filters: Processing click on "${clickedFilterName}" (ID: ${clickedFilterId})`);

        // Find all currently active filters
        const activeFilters = document.querySelectorAll('.js-quickfilter-button.ghx-active');
        console.log(`Jira Exclusive Filters: Found ${activeFilters.length} active filters`);

        // Deselect all other active filters
        let deselectedCount = 0;
        activeFilters.forEach(activeFilter => {
          const activeFilterId = activeFilter.getAttribute('data-filter-id');
          const activeFilterName = activeFilter.textContent.trim();

          // Don't deselect the filter we just clicked
          if (activeFilterId !== clickedFilterId) {
            console.log(`Jira Exclusive Filters: Deselecting "${activeFilterName}" (ID: ${activeFilterId})`);
            activeFilter.click();
            deselectedCount++;
          }
        });

        console.log(`Jira Exclusive Filters: Deselected ${deselectedCount} filters`);
        isProcessingClick = false;
      }, 100);
    }, true); // Use capture phase to run before Jira's handlers
  });

  console.log('Jira Exclusive Filters: Extension initialized successfully');
}

// Use MutationObserver to wait for the quick filters to load
const observer = new MutationObserver((mutations, obs) => {
  const filterContainer = document.querySelector('dl#js-work-quickfilters');
  if (filterContainer) {
    console.log('Jira Exclusive Filters: Quick filter container found, initializing');
    initializeExtension();
    obs.disconnect();
  }
});

// Start observing the document for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also try to initialize immediately in case filters are already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Jira Exclusive Filters: Document already loaded, attempting immediate initialization');
  setTimeout(() => {
    const filterContainer = document.querySelector('dl#js-work-quickfilters');
    if (filterContainer) {
      initializeExtension();
      observer.disconnect();
    }
  }, 1000);
}
