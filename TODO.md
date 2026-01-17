# TODO Items

## Known Issues

### Permission Dialog UX Issue
**Priority:** Medium  
**Status:** Known limitation, workaround in place

**Problem:**
When users add a custom Jira URL for the first time, they need to click "Add URL" twice:
1. First click: Permission dialog appears → User clicks "Allow" → Popup closes (Chrome behavior)
2. Second click: Permission already exists → URL saves successfully

This happens because Chrome extension popups automatically close when permission dialogs appear. This is a fundamental Chrome limitation, not a bug in our code.

**Current Workaround:**
Users need to reopen the popup and click "Add URL" again after granting permission. The second time works because permission already exists (no dialog = no popup closing).

**Potential Solutions to Explore:**

1. **Use a persistent window instead of popup**
   - Replace popup with `chrome.windows.create()` for URL management
   - Windows don't close when dialogs appear
   - Downside: Less integrated UX, requires separate window

2. **Pending URL auto-completion** (previously attempted but caused bugs)
   - Store URL as "pending" before showing permission dialog
   - Auto-detect and complete on popup reopen
   - Needs more robust implementation to avoid edge case bugs

3. **Better user messaging**
   - Add helper text: "After granting permission, click Add URL again"
   - Show a dismissible info banner explaining the two-step process
   - Update button text: "Grant Permission" → "Add URL"

4. **Chrome Web Store listing workaround**
   - Pre-request common Jira URL patterns in manifest (not scalable)
   - Document the two-click behavior in store listing

**Files Involved:**
- `popup.js` - Has detailed TODO comment in `addCustomUrl()` function
- `welcome.js` - Has TODO comment in `addCustomUrl()` function
- Reference: `BUGFIX_PERMISSIONS.md` for previous attempts

**Notes:**
- Welcome page may behave differently than popup (full tab vs popup)
- Issue only affects first-time URL addition (subsequent adds work fine)
- Jira Cloud (`*.atlassian.net`) works automatically, no permission needed
