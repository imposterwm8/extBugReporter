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
    button.addEventListener('click', () => generateBugReport());
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
    
    bugReportText.textContent = analysisMessages[analysisType] || analysisMessages.general;
    reportContainer.classList.remove('hidden');
    document.body.classList.add('expanded');
    startButton.style.display = 'none';
    
    bugReportText.textContent = `Loading AI model for ${analysisType} analysis... This may take a moment.`;
    
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
        files: ['asp-analyzer.js']
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
      if (bugReportText.textContent.includes('Loading AI model')) {
        bugReportText.textContent = 'AI model loaded! Processing... (this can take 10-30 seconds)';
      }
    }, 3000);
    
    setTimeout(() => {
      if (bugReportText.textContent.includes('Processing')) {
        bugReportText.textContent = 'AI model download taking longer than expected... (can take 2-3 minutes on first use)';
        
        setTimeout(() => {
          if (bugReportText.textContent.includes('download taking longer')) {
            bugReportText.textContent = 'AI analysis taking too long... generating basic report';
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
    bugReportText.textContent = `Error generating bug report: ${error.message}`;
  }
}

function displayBugReport(report) {
  const bugReportText = document.getElementById('bugReportText');
  bugReportData = report;
  bugReportText.innerHTML = parseMarkdown(report);
}

function parseMarkdown(text) {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(?!<[hul])/gim, '<p>')
    .replace(/([^>])\n/gim, '$1<br>')
    .replace(/<p><\/p>/gim, '')
    .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/gim, '');
}

document.getElementById('copyReport').addEventListener('click', async () => {
  const bugReportText = document.getElementById('bugReportText');
  const reportContainer = document.getElementById('reportContainer');
  
  try {
    await navigator.clipboard.writeText(bugReportData);
    reportContainer.classList.add('copy-success');
    setTimeout(() => {
      reportContainer.classList.remove('copy-success');
    }, 1000);
  } catch (error) {
    reportContainer.classList.add('copy-error');
    setTimeout(() => {
      reportContainer.classList.remove('copy-error');
    }, 1000);
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

document.getElementById('closeReport').addEventListener('click', () => {
  const reportContainer = document.getElementById('reportContainer');
  const startButton = document.getElementById('reportBug');
  
  reportContainer.classList.add('hidden');
  document.body.classList.remove('expanded');
  startButton.style.display = 'flex';
});
