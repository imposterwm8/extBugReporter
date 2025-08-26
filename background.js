// Background script now handles message routing between popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'bugReportData') {
    // Forward the bug report data to any listening popup
    chrome.runtime.sendMessage(request, (response) => {
      // Handle any response if needed
      sendResponse(response);
    });
    return true; // Keep message channel open for async response
  }
});