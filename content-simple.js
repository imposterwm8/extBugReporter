// Smart Bug Reporter - Gemini AI vs Pattern Analysis Only
// Removes all Transformers.js dependencies for cleaner, faster operation

// Prevent duplicate execution
(function() {
  if (window.bugReporterInitialized) {
    console.log('🔄 Bug reporter already initialized, skipping...');
    return;
  }
  window.bugReporterInitialized = true;

// Global console logs storage
window.capturedLogs = window.capturedLogs || [];

// Enhanced console log collection - capture existing logs and stop when extension starts
function setupConsoleCapture() {
  if (window.consoleHooked) return window.capturedLogs;
  
  const logs = [];
  const originalConsole = {};
  const methods = ['log', 'warn', 'error', 'info', 'debug'];
  let captureActive = true; // Stop capturing once extension starts heavy logging

  methods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = (...args) => {
      // Always call original console first
      originalConsole[method](...args);
      
      // Only capture if we haven't started extension processing yet
      if (captureActive) {
        const logText = args.join(' ').toLowerCase();
        
        // Stop capturing once we start our own processing
        if (logText.includes('starting bug report') || logText.includes('initializing ai')) {
          captureActive = false;
          return;
        }
        
        // Don't capture extension logs at all
        const isExtensionLog = logText.includes('🧠') || logText.includes('🚀') || 
                              logText.includes('📖') || logText.includes('✅') || 
                              logText.includes('❌') || logText.includes('bug reporter');
        
        if (!isExtensionLog) {
          const logEntry = { 
            method, 
            args: args.map(arg => {
              try {
                return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
              } catch {
                return '[Circular Object]';
              }
            }),
            timestamp: new Date().toISOString()
          };
          logs.push(logEntry);
          window.capturedLogs.push(logEntry);
        }
      }
    };
  });
  
  window.consoleHooked = true;
  // Stop capturing after 2 seconds to avoid infinite loops
  setTimeout(() => { captureActive = false; }, 2000);
  return logs;
}

// Start console capture immediately
setupConsoleCapture();

// Initialize immediately - no delays needed
console.log('🔧 Starting bug report generation...');
initializeAIBugReporter();

// Initialize AI functionality - Gemini or Pattern only
async function initializeAIBugReporter() {
  console.log('🚀 Initializing AI bug reporter...');
  
  try {
    // Check user's AI preference from settings with detailed debugging
    console.log('📖 Reading Chrome storage...');
    const settings = await chrome.storage.sync.get({
      aiMode: 'gemini',
      geminiApiKey: ''
    });
    
    console.log(`🎯 Settings loaded:`, { 
      aiMode: settings.aiMode, 
      hasApiKey: !!settings.geminiApiKey,
      apiKeyLength: settings.geminiApiKey ? settings.geminiApiKey.length : 0
    });
    
    // Only use Gemini if explicitly configured with API key
    if (settings.aiMode === 'gemini' && settings.geminiApiKey && settings.geminiApiKey.trim()) {
      console.log('🧠 Attempting Gemini AI analysis...');
      await createGeminiEnhancedReport(settings.geminiApiKey.trim());
    } else {
      console.log('📊 Using pattern analysis', {
        reason: !settings.geminiApiKey ? 'No API key' : 
                settings.aiMode !== 'gemini' ? 'Mode not Gemini' : 'Unknown'
      });
      createPatternBugReport();
    }
    
  } catch (error) {
    console.error('❌ AI initialization failed:', error);
    console.log('🔄 Falling back to pattern analysis');
    createPatternBugReport();
  }
}

// Create report using Gemini AI
async function createGeminiEnhancedReport(apiKey) {
  try {
    console.log('🧠 Initializing Gemini AI analysis...');
    
    // Check if Gemini analyzer is available
    if (!window.GeminiBugAnalyzer) {
      console.error('❌ Gemini analyzer script not loaded');
      throw new Error('Gemini analyzer not available - script injection failed');
    }
    
    console.log('✅ Gemini analyzer found, creating instance...');
    const analyzer = new window.GeminiBugAnalyzer(apiKey);
    
    // Gather page data
    console.log('📊 Gathering page data...');
    const pageData = {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText.slice(0, 2000),
      consoleErrors: getConsoleLogs(),
      domErrors: getDomErrors(),
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending request to Gemini API...');
    // Get Gemini analysis
    const analysis = await analyzer.analyzeBugReport(pageData);
    console.log('✅ Gemini analysis completed:', analysis);
    
    // Build comprehensive report
    let report = `${analysis.header}\n\n`;
    
    report += `### Gemini AI Analysis\n`;
    report += `**Summary:** ${analysis.summary}\n\n`;
    report += `**Severity:** ${analysis.severity} (${analysis.severityConfidence}% confidence)\n`;
    report += `**Category:** ${analysis.category} (${analysis.categoryConfidence}% confidence)\n`;
    report += `**Priority:** ${analysis.priority}\n\n`;
    
    if (analysis.rootCause) {
      report += `**Root Cause:** ${analysis.rootCause}\n\n`;
    }
    
    if (analysis.userImpact) {
      report += `**User Impact:** ${analysis.userImpact}\n\n`;
    }
    
    if (analysis.suggestedFix) {
      report += `**Suggested Fix:** ${analysis.suggestedFix}\n\n`;
    }
    
    if (analysis.technicalDetails) {
      report += `**Technical Details:** ${analysis.technicalDetails}\n\n`;
    }
    
    // Add standard sections
    report += `**URL:** ${pageData.url}\n`;
    report += `**Page Title:** ${pageData.title}\n`;
    report += `**Timestamp:** ${pageData.timestamp}\n`;
    report += `**Analysis Type:** ${analysis.analysisType}\n\n`;
    
    // Console logs section
    report += addConsoleLogsSection(pageData.consoleErrors);
    report += addDomErrorsSection(pageData.domErrors);
    
    console.log('📋 Sending Gemini report to popup...');
    chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
    
  } catch (error) {
    console.error('❌ Gemini analysis failed:', error.message || error);
    console.log('🔄 Falling back to pattern analysis');
    createPatternBugReport();
  }
}

// Create enhanced pattern-based report (no AI models needed)
function createPatternBugReport() {
  console.log('📊 Generating pattern-based bug report...');
  
  const url = window.location.href;
  const pageContent = document.body.innerText.slice(0, 1000);
  const consoleLogs = getConsoleLogs();
  const domErrors = getDomErrors();
  
  // Generate smart header using patterns
  const smartHeader = enhancedFallbackHeader(url, domErrors, pageContent);
  
  // Analyze context using patterns
  const context = analyzeContextWithPatterns(pageContent);
  
  // Build enhanced report
  let report = `${smartHeader}\n\n`;
  
  // Add analysis section
  const analysisTitle = 'Pattern Analysis';
  report += `### ${analysisTitle}\n`;
  report += `**Issue Severity:** ${context.severity} (${context.severityConfidence}% confidence)\n`;
  report += `**Issue Context:** ${context.context} (${context.contextConfidence}% confidence)\n`;
  report += `**Analysis Type:** ${context.analysisType}\n\n`;
  
  // Add URL
  report += `**URL:** ${url}\n`;
  report += `**Page Title:** ${document.title}\n`;
  report += `**Timestamp:** ${new Date().toISOString()}\n\n`;

  // Console logs section
  report += addConsoleLogsSection(consoleLogs);
  report += addDomErrorsSection(domErrors);
  
  console.log('📋 Sending pattern report to popup...');
  chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
}

// Enhanced fallback header generation (pattern-based)
function enhancedFallbackHeader(url, errors, pageContent) {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = document.title.toLowerCase();
  const lowerContent = pageContent.toLowerCase();
  
  // HTTP error patterns (enhanced)
  if (lowerUrl.includes('error') || lowerTitle.includes('error') || 
      lowerContent.includes('404') || lowerContent.includes('500') ||
      lowerContent.includes('not found') || lowerContent.includes('server error')) {
    return '## HTTP Error Page (Pattern Analysis)';
  }
  
  // Authentication patterns
  if (lowerContent.includes('login') || lowerContent.includes('sign in') ||
      lowerContent.includes('unauthorized') || lowerContent.includes('access denied')) {
    return '## Authentication Issue (Pattern Analysis)';
  }
  
  // Console error patterns (enhanced)
  if (errors.some(error => error.toLowerCase().includes('typeerror'))) {
    return '## JavaScript TypeError (Pattern Analysis)';
  }
  
  if (errors.some(error => error.toLowerCase().includes('referenceerror'))) {
    return '## JavaScript Reference Error (Pattern Analysis)';
  }
  
  if (errors.some(error => error.toLowerCase().includes('network'))) {
    return '## Network Connection Issue (Pattern Analysis)';
  }
  
  // Form/validation patterns
  if (lowerContent.includes('required field') || lowerContent.includes('validation') ||
      errors.some(error => error.toLowerCase().includes('validation'))) {
    return '## Form Validation Issue (Pattern Analysis)';
  }

  // Service-specific patterns
  if (lowerUrl.includes('microsoft.com') || lowerUrl.includes('office.com')) {
    return '## Microsoft Service Issue (Pattern Analysis)';
  }
  
  if (lowerUrl.includes('github.com')) {
    return '## GitHub Platform Issue (Pattern Analysis)';
  }
  
  if (lowerUrl.includes('google.com')) {
    return '## Google Service Issue (Pattern Analysis)';
  }

  // Generic fallback with confidence
  return '## Page Issue Report (Pattern Analysis)';
}

// Pattern-based context analysis fallback
function analyzeContextWithPatterns(pageContent) {
  const lowerContent = pageContent.toLowerCase();
  
  // Determine severity
  let severity = 'informational';
  let severityConfidence = 60;
  
  if (lowerContent.includes('error') || lowerContent.includes('failed') || 
      lowerContent.includes('404') || lowerContent.includes('500')) {
    severity = 'critical error';
    severityConfidence = 85;
  } else if (lowerContent.includes('warning') || lowerContent.includes('caution')) {
    severity = 'warning';
    severityConfidence = 75;
  } else if (lowerContent.includes('issue') || lowerContent.includes('problem')) {
    severity = 'minor issue';
    severityConfidence = 70;
  }
  
  // Determine context
  let context = 'general page issue';
  let contextConfidence = 60;
  
  if (lowerContent.includes('login') || lowerContent.includes('unauthorized') || 
      lowerContent.includes('access denied')) {
    context = 'user authentication failed';
    contextConfidence = 80;
  } else if (lowerContent.includes('network') || lowerContent.includes('connection') ||
             lowerContent.includes('timeout')) {
    context = 'network connectivity problem';
    contextConfidence = 80;
  } else if (lowerContent.includes('server error') || lowerContent.includes('500') ||
             lowerContent.includes('internal error')) {
    context = 'server internal error';
    contextConfidence = 85;
  } else if (lowerContent.includes('validation') || lowerContent.includes('required field')) {
    context = 'form data validation issue';
    contextConfidence = 75;
  } else if (lowerContent.includes('loading') || lowerContent.includes('not found')) {
    context = 'page content loading problem';
    contextConfidence = 75;
  }
  
  return {
    severity,
    severityConfidence: severityConfidence.toString(),
    context,
    contextConfidence: contextConfidence.toString(),
    analysisType: 'pattern-based'
  };
}

// Get captured console logs
function getConsoleLogs() {
  return window.capturedLogs || setupConsoleCapture();
}

// Enhanced DOM error detection
function getDomErrors() {
  const errors = [];
  
  // Look for error elements
  const errorSelectors = [
    '.error', '.alert-danger', '.alert-error', '.warning',
    '[role="alert"]', '.notification-error', '.toast-error',
    '.field-error', '.form-error', '.validation-error'
  ];
  
  errorSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      if (element.innerText.trim()) {
        errors.push(`DOM Error (${selector}): ${element.innerText.trim().slice(0, 200)}`);
      }
    });
  });

  // Look for HTTP status codes in page content
  const bodyText = document.body.innerText;
  const httpErrorPattern = /\b(4\d{2}|5\d{2})\b/g;
  const httpErrors = bodyText.match(httpErrorPattern);
  if (httpErrors) {
    errors.push(`HTTP Status Codes found: ${httpErrors.join(', ')}`);
  }

  // Check for JavaScript errors in page
  if (window.onerror || window.addEventListener) {
    window.addEventListener('error', (event) => {
      errors.push(`JavaScript Error: ${event.error?.message || event.message}`);
    });
  }

  return errors;
}

// Helper function to add console logs section
function addConsoleLogsSection(consoleLogs) {
  let section = '### Console Activity\n';
  if (consoleLogs.length > 0) {
    consoleLogs.forEach(log => {
      section += `[${log.method.toUpperCase()}] ${log.args.join(' ')}\n`;
    });
  } else {
    section += 'No console activity detected.\n';
  }
  section += '\n';
  return section;
}

// Helper function to add DOM errors section
function addDomErrorsSection(domErrors) {
  let section = '### Page Issues\n';
  if (domErrors.length > 0) {
    domErrors.forEach(error => {
      section += `- ${error}\n`;
    });
  } else {
    section += 'No obvious page issues found.\n';
  }
  section += '\n';
  return section;
}

})(); // Close the IIFE that prevents duplicate execution