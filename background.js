chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'bugReportData') {
    chrome.runtime.sendMessage(request, (response) => {
      sendResponse(response);
    });
    return true;
  }
});