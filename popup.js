let currentTab = null;
let bugReportData = null;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
  const button = document.getElementById('reportBug');
  
  const isValidWebPage = currentTab.url && 
    (currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://')) &&
    !currentTab.url.startsWith('chrome://') &&
    !currentTab.url.startsWith('chrome-extension://') &&
    !currentTab.url.startsWith('moz-extension://') &&
    !currentTab.url.startsWith('edge://') &&
    !currentTab.url.startsWith('about:');
  
  if (isValidWebPage) {
    button.disabled = false;
    button.addEventListener('click', generateBugReport);
  } else {
    button.disabled = true;
    button.textContent = 'Not Available';
    button.title = 'Bug reporting is only available on web pages (http/https)';
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'bugReportData') {
    displayBugReport(request.report);
    sendResponse({ received: true });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${targetTab}-panel`).classList.add('active');
    });
  });

  document.getElementById('perfAnalysis')?.addEventListener('click', () => {
    generateBugReport('performance');
  });

  document.getElementById('reactAnalysis')?.addEventListener('click', () => {
    generateBugReport('react');
  });

  document.getElementById('securityScan')?.addEventListener('click', () => {
    generateBugReport('security');
  });

  document.getElementById('accessibilityCheck')?.addEventListener('click', () => {
    generateBugReport('accessibility');
  });
});

async function generateBugReport(analysisType = 'general') {
  const reportContainer = document.getElementById('reportContainer');
  const bugReportText = document.getElementById('bugReportText');
  const startButton = document.getElementById('reportBug');
  
  try {
    const analysisMessages = {
      general: 'Analyzing page for bug report...',
      performance: 'Running performance audit...',
      react: 'Analyzing React components and hooks...',
      security: 'Scanning for security vulnerabilities...',
      accessibility: 'Checking accessibility compliance...'
    };
    
    bugReportText.value = analysisMessages[analysisType] || analysisMessages.general;
    reportContainer.classList.remove('hidden');
    document.body.classList.add('expanded');
    startButton.style.display = 'none';
    
    bugReportText.value = `Loading AI model for ${analysisType} analysis... This may take a moment.`;
    
    const settings = await chrome.storage.sync.get({
      aiMode: 'gemini',
      geminiApiKey: ''
    });
    
    
    try {
      if (settings.aiMode === 'gemini' && settings.geminiApiKey) {
        // Inject Gemini AI script first
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['gemini-ai.js']
        });
      }
      
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['react-analyzer.js']
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['react-advanced.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['performance-monitor.js']
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content-simple.js']
      });
      
    } catch (injectionError) {
      
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content-simple.js']
      });
    }
    
    setTimeout(() => {
      if (bugReportText.value.includes('Loading AI model')) {
        bugReportText.value = 'AI model loaded! Processing... (this can take 10-30 seconds)';
      }
    }, 3000);
    
    setTimeout(() => {
      if (bugReportText.value.includes('Processing')) {
        bugReportText.value = 'AI model download taking longer than expected... (can take 2-3 minutes on first use)';
        
        setTimeout(() => {
          if (bugReportText.value.includes('download taking longer')) {
            bugReportText.value = 'AI analysis taking too long... generating basic report';
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: () => {
                const url = window.location.href;
                const report = `## Basic Page Report\n\nURL: ${url}\nPage Title: ${document.title}\nTimestamp: ${new Date().toISOString()}\n\nNote: AI analysis timed out after 2 minutes - this is a basic report.\nTip: First AI analysis can take 2-3 minutes to download models. Try again for faster results.`;
                chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
              }
            });
          }
        }, 90000);
      }
    }, 30000);
    
  } catch (error) {
    bugReportText.value = `Error generating bug report: ${error.message}`;
  }
}

function displayBugReport(report) {
  const bugReportText = document.getElementById('bugReportText');
  bugReportData = report;
  bugReportText.value = report;
}

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

document.getElementById('refreshReport').addEventListener('click', () => {
  console.log('🔄 Refresh button clicked');
  
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: () => {
      window.bugReporterInitialized = false;
      window.bugReporterClassifier = null;
      window.bugReporterInitializing = false;
      console.log('🧹 Cleared bug reporter state for refresh');
    }
  }).then(() => {
    generateBugReport();
  }).catch(error => {
    console.error('Error clearing state:', error);
    generateBugReport();
  });
});

document.getElementById('backToTabs').addEventListener('click', () => {
  const reportContainer = document.getElementById('reportContainer');
  const tabContainer = document.querySelector('.tab-container');
  
  reportContainer.classList.add('hidden');
  document.body.classList.remove('expanded');
  tabContainer.style.display = 'block';
});

document.getElementById('closeReport').addEventListener('click', () => {
  const reportContainer = document.getElementById('reportContainer');
  const tabContainer = document.querySelector('.tab-container');
  
  reportContainer.classList.add('hidden');
  document.body.classList.remove('expanded');
  tabContainer.style.display = 'block';
});
