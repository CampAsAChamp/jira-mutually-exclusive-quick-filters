// Jira Mutually Exclusive Quick Filters - Content Script
// Makes quick filters mutually exclusive by auto-deselecting others when one is clicked

console.log('Jira Mutually Exclusive Quick Filters: Content script loaded');

// Flag to prevent recursive clicking
let isProcessingClick = false;

// Keep track of initialized containers to avoid duplicate event listeners
// Store a Set of initialized DOM element references
let initializedContainers = new Set();

// Handler function for filter button clicks
async function handleFilterClick(button) {
  // Prevent recursive clicking
  if (isProcessingClick) {
    console.log('Jira Mutually Exclusive Quick Filters: Already processing a click, skipping');
    return;
  }

  // Check if the mutually exclusive feature is enabled
  let isEnabled = true; // Default to enabled
  try {
    if (chrome && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get({ mutuallyExclusive: true });
      isEnabled = result.mutuallyExclusive;
    } else {
      console.warn('Jira Mutually Exclusive Quick Filters: chrome.storage not available, using default (enabled)');
    }
  } catch (error) {
    console.error('Jira Mutually Exclusive Quick Filters: Error reading storage:', error);
    // Default to enabled if there's an error
  }

  console.log(`Jira Exclusive Quick Filters: Feature enabled: ${isEnabled}`);

  if (!isEnabled) {
    console.log('Jira Mutually Exclusive Quick Filters: Feature disabled, allowing normal behavior');
    return;
  }

  isProcessingClick = true;

  // Small delay to let the current click register first
  setTimeout(() => {
    const clickedFilterId = button.getAttribute('data-filter-id');
    const clickedFilterName = button.textContent.trim();
    console.log(`Jira Exclusive Quick Filters: Processing click on "${clickedFilterName}" (ID: ${clickedFilterId})`);

    // Find all currently active filters (works for both sprint and backlog views)
    const activeFilters = document.querySelectorAll('.js-quickfilter-button.ghx-active');
    console.log(`Jira Exclusive Quick Filters: Found ${activeFilters.length} active filters`);

    // Deselect all other active filters
    let deselectedCount = 0;
    activeFilters.forEach(activeFilter => {
      const activeFilterId = activeFilter.getAttribute('data-filter-id');
      const activeFilterName = activeFilter.textContent.trim();

      // Don't deselect the filter we just clicked
      if (activeFilterId !== clickedFilterId) {
        console.log(`Jira Exclusive Quick Filters: Deselecting "${activeFilterName}" (ID: ${activeFilterId})`);
        activeFilter.click();
        deselectedCount++;
      }
    });

    console.log(`Jira Exclusive Quick Filters: Deselected ${deselectedCount} filters`);
    isProcessingClick = false;
  }, 100);
}

// Initialize a single container
function initializeContainer(filterContainer) {
  const containerId = filterContainer.id;

  // Check if we already initialized THIS EXACT container element
  if (initializedContainers.has(filterContainer)) {
    console.log(`Jira Mutually Exclusive Quick Filters: Container ${containerId} already initialized, skipping`);
    return false;
  }

  console.log(`Jira Mutually Exclusive Quick Filters: Initializing container ${containerId}`);

  // Get all filter buttons within this specific container
  const filterButtons = filterContainer.querySelectorAll('.js-quickfilter-button');
  console.log(`Jira Exclusive Quick Filters: Found ${filterButtons.length} filter buttons in ${containerId}`);

  if (filterButtons.length === 0) {
    console.log(`Jira Mutually Exclusive Quick Filters: No filter buttons found in ${containerId}`);
    return false;
  }

  // Use event delegation: add ONE listener to the container instead of to each button
  // This way, even if buttons are recreated, the listener still works
  filterContainer.addEventListener('click', async (e) => {
    // Check if the clicked element is a filter button
    const button = e.target.closest('.js-quickfilter-button');
    if (button) {
      console.log(`Jira Mutually Exclusive Quick Filters: Filter button clicked via delegation in ${containerId}`);
      await handleFilterClick(button);
    }
  }, true); // Use capture phase to run before Jira's handlers

  // Mark this container element as initialized
  initializedContainers.add(filterContainer);

  console.log(`Jira Mutually Exclusive Quick Filters: Container ${containerId} initialized successfully with event delegation`);
  return true;
}

// Initialize the extension for all available quick filter containers
function initializeExtension() {
  console.log('Jira Mutually Exclusive Quick Filters: Initializing extension');

  let initializedCount = 0;

  // Try both container types
  // Sprint board: dl#js-work-quickfilters
  // Backlog: dl#js-plan-quickfilters
  const workContainer = document.querySelector('dl#js-work-quickfilters');
  const planContainer = document.querySelector('dl#js-plan-quickfilters');

  if (workContainer) {
    if (initializeContainer(workContainer)) {
      initializedCount++;
    }
  }

  if (planContainer) {
    if (initializeContainer(planContainer)) {
      initializedCount++;
    }
  }

  if (initializedCount === 0) {
    console.log('Jira Mutually Exclusive Quick Filters: No containers found or all already initialized');
    return false;
  }

  console.log(`Jira Mutually Exclusive Quick Filters: Initialized ${initializedCount} container(s)`);
  return true;
}

// Use MutationObserver to wait for the quick filters to load AND to re-initialize when switching views
const observer = new MutationObserver((mutations, obs) => {
  // Try to initialize any containers that exist but aren't initialized yet
  // This will automatically handle both sprint and backlog views
  initializeExtension();
});

// Start observing the document for changes (don't disconnect, keep watching for view changes)
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also try to initialize immediately in case filters are already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Jira Mutually Exclusive Quick Filters: Document already loaded, attempting immediate initialization');
  setTimeout(() => {
    initializeExtension();
  }, 1000);
}
