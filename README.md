# Jira Exclusive Quick Filters

A Chrome extension that makes Jira quick filters mutually exclusive - clicking one filter automatically deselects all others.

## 🎯 Problem

By default, Jira allows you to combine multiple quick filters by clicking them. However, if you want filters to be mutually exclusive (only one active at a time), you have to manually deselect the currently active filter before selecting a new one. This extension automates that process.

## ✨ Features

- **Mutually Exclusive Filters**: Clicking a quick filter automatically deselects all other active filters
- **Toggle On/Off**: Enable or disable the feature via the extension popup
- **Works on All Boards**: Applies to all Jira boards on your-jira-instance.atlassian.net
- **Persistent Settings**: Your preference is saved across browser sessions
- **Visual Feedback**: Badge indicator shows when the feature is disabled

## 📦 Installation

### Loading the Extension Locally

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `jira-exclusive-filters` folder
5. The extension should now appear in your toolbar

### Reloading After Changes

If you make any code changes:
1. Go to `chrome://extensions/`
2. Click the **reload icon** (circular arrow) on the extension card
3. Refresh any open Jira tabs to apply the updated content script

## 🚀 Usage

1. Navigate to any Jira board (e.g., your team's sprint board)
2. Click the extension icon in your Chrome toolbar
3. Toggle **"Make quick filters mutually exclusive"** on or off
4. When enabled:
   - Click any quick filter → it activates
   - Click a different filter → the previous one auto-deselects
5. When disabled:
   - Filters work normally (can combine multiple filters)

## 🔧 How It Works

The extension uses DOM manipulation to detect when quick filters are clicked and automatically deselects other active filters before the click completes.

**Key Components:**
- **manifest.json**: Extension configuration
- **content.js**: Main logic that runs on Jira pages
- **popup.html/js/css**: User interface for the toggle switch
- **background.js**: Service worker for state management
- **icons/**: Extension icons (16px, 48px, 128px)

**Confirmed Jira Selectors:**
- Container: `dl#js-work-quickfilters`
- Filter buttons: `.js-quickfilter-button`
- Active filters: `.js-quickfilter-button.ghx-active`
- Filter ID: `data-filter-id` attribute

## 🐛 Debugging

### Chrome DevTools

**Debug the Popup:**
- Right-click the extension icon → **Inspect**
- This opens DevTools for `popup.js`

**Debug Content Script:**
- Open a Jira page
- Press **F12** to open DevTools
- Go to the **Console** tab
- Look for messages starting with "Jira Exclusive Quick Filters:"

**Debug Background Service Worker:**
- Go to `chrome://extensions/`
- Find "Jira Exclusive Quick Filters"
- Click **"Inspect views: service worker"**
- View logs from `background.js`

### Common Issues

**Extension not working:**
1. Check that the extension is loaded in `chrome://extensions/`
2. Verify Developer mode is enabled
3. Check the Console for error messages
4. Try reloading the extension
5. Refresh the Jira page

**Filters not being deselected:**
1. Open DevTools Console on the Jira page
2. Look for "Jira Exclusive Quick Filters:" log messages
3. Verify the feature is enabled in the popup
4. Check if the filter buttons have the expected classes

## 🧪 Testing

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Navigate to a Jira board
- [ ] Open extension popup - verify toggle appears
- [ ] Enable the toggle
- [ ] Click a quick filter - verify it activates
- [ ] Click a different filter - verify first one deselects
- [ ] Try clicking 3-4 filters rapidly - verify only last is active

**Toggle Functionality:**
- [ ] Disable toggle in popup
- [ ] Click multiple filters - verify they combine (normal behavior)
- [ ] Re-enable toggle - verify exclusive behavior returns

**Persistence:**
- [ ] Set toggle to enabled/disabled
- [ ] Close and reopen Chrome
- [ ] Verify toggle state persists

**Edge Cases:**
- [ ] Test with rapid clicking
- [ ] Test browser back/forward buttons
- [ ] Verify no console errors

## 📝 Development

### Project Structure

```
jira-exclusive-filters/
├── manifest.json          # Extension configuration
├── content.js            # Main logic for filter manipulation
├── background.js         # Service worker for state management
├── popup.html           # UI for toggle switch
├── popup.js             # Toggle logic
├── popup.css            # Styling
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md            # This file
└── .gitignore           # Git ignore patterns
```

### Tech Stack

- **Manifest Version**: 3
- **Permissions**: `storage` (for saving user preferences)
- **Host Permissions**: `https://your-jira-instance.atlassian.net/*`
- **APIs Used**: Chrome Storage API, Content Scripts, Service Workers

## 📄 License

This is a personal project. Use freely as needed.

## 🙋 Author

Created by Nick Schneider ([@CampAsAChamp](https://github.com/CampAsAChamp))

---

**Version**: 1.0.0
