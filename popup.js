let currentTab = null;
let bugReportData = null;

// Check if current tab is a valid web page when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
  const button = document.getElementById('reportBug');
  
  // Check if it's a valid web page
  const isValidWebPage = currentTab.url && 
    (currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://')) &&
    !currentTab.url.startsWith('chrome://') &&
    !currentTab.url.startsWith('chrome-extension://') &&
    !currentTab.url.startsWith('moz-extension://') &&
    !currentTab.url.startsWith('edge://') &&
    !currentTab.url.startsWith('about:');
  
  if (isValidWebPage) {
    // Enable button for valid web pages
    button.disabled = false;
    button.addEventListener('click', generateBugReport);
  } else {
    // Disable button for non-web pages
    button.disabled = true;
    button.textContent = 'Not Available';
    button.title = 'Bug reporting is only available on web pages (http/https)';
  }
});

// Generate bug report and display in popup
async function generateBugReport() {
  const reportContainer = document.getElementById('reportContainer');
  const bugReportText = document.getElementById('bugReportText');
  const startButton = document.getElementById('reportBug');
  
  try {
    // Show loading state
    bugReportText.value = 'Scraping together bug report... click Refresh if nothing appears';
    reportContainer.classList.remove('hidden');
    document.body.classList.add('expanded');
    startButton.style.display = 'none';
    
    // Execute AI-enhanced content script to collect data
    bugReportText.value = 'Loading AI model for smart analysis... This may take a moment on first use.';
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content-ai-bundled.js']  // Use self-contained bundled version with transformers.js
    });
    
    // Update loading message after script execution
    setTimeout(() => {
      if (bugReportText.value.includes('Loading AI model')) {
        bugReportText.value = 'AI model loaded! Analyzing page content... click Refresh if nothing appears';
      }
    }, 2000);
    
    // Listen for the bug report data from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'bugReportData') {
        displayBugReport(request.report);
        sendResponse({ received: true });
      }
    });
    
  } catch (error) {
    bugReportText.value = `Error generating bug report: ${error.message}`;
  }
}

// Display the bug report in the text area
function displayBugReport(report) {
  const bugReportText = document.getElementById('bugReportText');
  bugReportData = report;
  bugReportText.value = report;
}

// Copy report to clipboard
document.getElementById('copyReport').addEventListener('click', async () => {
  const bugReportText = document.getElementById('bugReportText');
  const notification = document.getElementById('notification');
  
  try {
    await navigator.clipboard.writeText(bugReportText.value);
    notification.textContent = 'Copied to clipboard!';
    notification.classList.remove('hidden');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 2000);
  } catch (error) {
    notification.textContent = 'Failed to copy';
    notification.classList.remove('hidden');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 2000);
  }
});

// Refresh report
document.getElementById('refreshReport').addEventListener('click', () => {
  generateBugReport();
});

// Close report view
document.getElementById('closeReport').addEventListener('click', () => {
  const reportContainer = document.getElementById('reportContainer');
  const startButton = document.getElementById('reportBug');
  
  reportContainer.classList.add('hidden');
  document.body.classList.remove('expanded');
  startButton.style.display = 'flex';
});
