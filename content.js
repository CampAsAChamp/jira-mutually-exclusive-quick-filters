// Jira Mutually Exclusive Quick Filters - Content Script
// Makes quick filters mutually exclusive by auto-deselecting others when one is clicked

// ============================================================================
// CONSTANTS
// ============================================================================
const CONFIG = {
  SELECTORS: {
    WORK_CONTAINER: 'dl#js-work-quickfilters',
    PLAN_CONTAINER: 'dl#js-plan-quickfilters',
    FILTER_BUTTON: '.js-quickfilter-button',
    ACTIVE_FILTER: '.js-quickfilter-button.ghx-active'
  },
  TIMING: {
    CLICK_DELAY: 100,           // Delay before processing click
    INIT_DELAY: 1000,           // Initial load delay
    MUTATION_DEBOUNCE: 250      // Debounce for mutation observer
  },
  STORAGE_KEY: 'mutuallyExclusive',
  DEFAULT_ENABLED: true
};

const LOG_PREFIX = 'Jira Mutually Exclusive Quick Filters:';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
  isProcessingClick: false,
  initializedContainers: new Set(),
  isEnabled: CONFIG.DEFAULT_ENABLED
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Simple debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Logging helper
const log = {
  info: (...args) => console.log(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
  error: (...args) => console.error(LOG_PREFIX, ...args)
};

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

// Load and cache the enabled state
async function loadEnabledState() {
  try {
    if (!chrome?.storage?.sync) {
      log.warn('chrome.storage not available, using default (enabled)');
      return CONFIG.DEFAULT_ENABLED;
    }

    const result = await chrome.storage.sync.get({
      [CONFIG.STORAGE_KEY]: CONFIG.DEFAULT_ENABLED
    });
    state.isEnabled = result[CONFIG.STORAGE_KEY];
    log.info(`Feature enabled: ${state.isEnabled}`);
    return state.isEnabled;
  } catch (error) {
    log.error('Error reading storage:', error);
    return CONFIG.DEFAULT_ENABLED;
  }
}

// Listen for storage changes to update cached state
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[CONFIG.STORAGE_KEY]) {
      state.isEnabled = changes[CONFIG.STORAGE_KEY].newValue;
      log.info(`Feature toggled: ${state.isEnabled}`);
    }
  });
}

// ============================================================================
// FILTER MANAGEMENT
// ============================================================================

// Get filter info helper
function getFilterInfo(button) {
  return {
    id: button.getAttribute('data-filter-id'),
    name: button.textContent.trim()
  };
}

// Deselect all active filters except the clicked one
function deactivateOtherFilters(clickedFilterId) {
  const activeFilters = document.querySelectorAll(CONFIG.SELECTORS.ACTIVE_FILTER);
  log.info(`Found ${activeFilters.length} active filters`);

  let deselectedCount = 0;
  activeFilters.forEach(activeFilter => {
    const { id, name } = getFilterInfo(activeFilter);

    if (id !== clickedFilterId) {
      log.info(`Deselecting "${name}" (ID: ${id})`);
      activeFilter.click();
      deselectedCount++;
    }
  });

  log.info(`Deselected ${deselectedCount} filters`);
  return deselectedCount;
}

// Handler function for filter button clicks
async function handleFilterClick(button) {
  // Prevent recursive clicking
  if (state.isProcessingClick) {
    log.info('Already processing a click, skipping');
    return;
  }

  // Check if feature is enabled
  if (!state.isEnabled) {
    log.info('Feature disabled, allowing normal behavior');
    return;
  }

  state.isProcessingClick = true;

  // Small delay to let the current click register first
  setTimeout(() => {
    try {
      const { id, name } = getFilterInfo(button);
      log.info(`Processing click on "${name}" (ID: ${id})`);

      deactivateOtherFilters(id);
    } catch (error) {
      log.error('Error handling filter click:', error);
    } finally {
      state.isProcessingClick = false;
    }
  }, CONFIG.TIMING.CLICK_DELAY);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize a single container with event delegation
function initializeContainer(filterContainer) {
  const containerId = filterContainer.id;

  // Check if already initialized
  if (state.initializedContainers.has(filterContainer)) {
    log.info(`Container ${containerId} already initialized, skipping`);
    return false;
  }

  log.info(`Initializing container ${containerId}`);

  // Check for filter buttons
  const filterButtons = filterContainer.querySelectorAll(CONFIG.SELECTORS.FILTER_BUTTON);
  log.info(`Found ${filterButtons.length} filter buttons in ${containerId}`);

  if (filterButtons.length === 0) {
    log.info(`No filter buttons found in ${containerId}`);
    return false;
  }

  // Use event delegation with capture phase
  filterContainer.addEventListener('click', async (e) => {
    const button = e.target.closest(CONFIG.SELECTORS.FILTER_BUTTON);
    if (button) {
      log.info(`Filter button clicked via delegation in ${containerId}`);
      await handleFilterClick(button);
    }
  }, true);

  state.initializedContainers.add(filterContainer);
  log.info(`Container ${containerId} initialized successfully`);
  return true;
}

// Initialize all available quick filter containers
function initializeExtension() {
  log.info('Initializing extension');

  let initializedCount = 0;

  // Try both container types (Sprint board and Backlog)
  const containers = [
    document.querySelector(CONFIG.SELECTORS.WORK_CONTAINER),
    document.querySelector(CONFIG.SELECTORS.PLAN_CONTAINER)
  ];

  containers.forEach(container => {
    if (container && initializeContainer(container)) {
      initializedCount++;
    }
  });

  if (initializedCount === 0) {
    log.info('No containers found or all already initialized');
    return false;
  }

  log.info(`Initialized ${initializedCount} container(s)`);
  return true;
}

// ============================================================================
// OBSERVERS & STARTUP
// ============================================================================

// Debounced initialization for mutation observer
const debouncedInit = debounce(
  initializeExtension,
  CONFIG.TIMING.MUTATION_DEBOUNCE
);

// Use MutationObserver to handle dynamic content
const observer = new MutationObserver(() => {
  debouncedInit();
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initialize on load
(async function startup() {
  log.info('Content script loaded');

  // Load enabled state from storage
  await loadEnabledState();

  // Try immediate initialization if DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log.info('Document already loaded, attempting immediate initialization');
    setTimeout(initializeExtension, CONFIG.TIMING.INIT_DELAY);
  }
})();
