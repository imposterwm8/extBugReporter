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

// Set up message listener at module level (before any script execution)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'bugReportData') {
    displayBugReport(request.report);
    sendResponse({ received: true });
  }
});

// Generate bug report and display in popup
async function generateBugReport() {
  const reportContainer = document.getElementById('reportContainer');
  const bugReportText = document.getElementById('bugReportText');
  const startButton = document.getElementById('reportBug');
  
  try {
    // Show loading state
    bugReportText.value = 'Analyzing page for bug report...';
    reportContainer.classList.remove('hidden');
    document.body.classList.add('expanded');
    startButton.style.display = 'none';
    
    // Execute AI-enhanced content script to collect data
    bugReportText.value = 'Loading AI model for smart analysis... This may take a moment.';
    
    // Get user settings to determine what to inject
    const settings = await chrome.storage.sync.get({
      aiMode: 'gemini',
      geminiApiKey: ''
    });
    
    console.log(`🎯 Using AI mode: ${settings.aiMode}`);
    
    // Inject appropriate scripts based on AI mode
    try {
      if (settings.aiMode === 'gemini' && settings.geminiApiKey) {
        // Inject Gemini AI script first
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['gemini-ai.js']
        });
        console.log('✅ Gemini AI script injected');
      }
      
      // Always inject the simplified content script
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content-simple.js']
      });
      console.log('✅ Simplified content script injected');
      
    } catch (injectionError) {
      console.warn('⚠️ Script injection failed:', injectionError);
      
      // Fallback: just inject content script (will use pattern analysis)
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content-simple.js']
      });
    }
    
    // Update loading message after script execution
    setTimeout(() => {
      if (bugReportText.value.includes('Loading AI model')) {
        bugReportText.value = 'AI model loaded! Processing... (this can take 10-30 seconds)';
      }
    }, 3000);
    
    // Set timeout to show fallback if AI takes too long
    setTimeout(() => {
      if (bugReportText.value.includes('Processing')) {
        bugReportText.value = 'AI model download taking longer than expected... (can take 2-3 minutes on first use)';
        
        // Extend timeout for first-time model download
        setTimeout(() => {
          if (bugReportText.value.includes('download taking longer')) {
            bugReportText.value = 'AI analysis taking too long... generating basic report';
            // Execute fallback script
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: () => {
                // Fallback basic report
                const url = window.location.href;
                const report = `## Basic Page Report\n\nURL: ${url}\nPage Title: ${document.title}\nTimestamp: ${new Date().toISOString()}\n\nNote: AI analysis timed out after 2 minutes - this is a basic report.\nTip: First AI analysis can take 2-3 minutes to download models. Try again for faster results.`;
                chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
              }
            });
          }
        }, 90000); // Additional 90 seconds (total 2 minutes)
      }
    }, 30000);
    
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
  console.log('🔄 Refresh button clicked');
  
  // Clear any existing bug reporter state on the page
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: () => {
      // Clear the existing state to allow fresh execution
      window.bugReporterInitialized = false;
      window.bugReporterClassifier = null;
      window.bugReporterInitializing = false;
      console.log('🧹 Cleared bug reporter state for refresh');
    }
  }).then(() => {
    // Generate new report
    generateBugReport();
  }).catch(error => {
    console.error('Error clearing state:', error);
    // Try generating anyway
    generateBugReport();
  });
});

// Close report view
document.getElementById('closeReport').addEventListener('click', () => {
  const reportContainer = document.getElementById('reportContainer');
  const startButton = document.getElementById('reportBug');
  
  reportContainer.classList.add('hidden');
  document.body.classList.remove('expanded');
  startButton.style.display = 'flex';
});
