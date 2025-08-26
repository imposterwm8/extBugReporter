// Self-contained AI-enhanced bug reporter using bundled Transformers.js
// This script includes the transformers library inline and performs smart bug analysis

// Global console logs storage
window.capturedLogs = window.capturedLogs || [];

// Enhanced console log collection - set up immediately when script loads
function setupConsoleCapture() {
  if (window.consoleHooked) return window.capturedLogs;
  
  const logs = [];
  const originalConsole = {};
  const methods = ['log', 'warn', 'error', 'info', 'debug'];

  methods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = (...args) => {
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
      originalConsole[method](...args);
    };
  });
  
  window.consoleHooked = true;
  return logs;
}

// Start console capture immediately
setupConsoleCapture();

// Inline Transformers.js bundle (compressed)
(function() {
  // Load the transformers library from our bundled version
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('lib/transformers.min.js');
  script.onload = function() {
    // Initialize AI functionality after transformers loads
    initializeAIBugReporter();
  };
  script.onerror = function() {
    console.error('❌ Failed to load Transformers.js bundle');
    createBasicBugReport();
  };
  document.head.appendChild(script);
})();

// Global classifier instance
let classifier = null;
let isInitializing = false;

// Initialize AI functionality
async function initializeAIBugReporter() {
  console.log('🚀 Initializing AI bug reporter...');
  
  try {
    // Wait for transformers to be available - check various possible global names
    let transformersLib = null;
    let retries = 0;
    const maxRetries = 50;
    
    while (!transformersLib && retries < maxRetries) {
      // Try different global variable names that Transformers.js might use
      if (typeof window.transformers !== 'undefined') {
        transformersLib = window.transformers;
      } else if (typeof window.Transformers !== 'undefined') {
        transformersLib = window.Transformers;
      } else if (typeof transformers !== 'undefined') {
        transformersLib = transformers;
      } else if (typeof window.tf !== 'undefined' && window.tf.pipeline) {
        transformersLib = window.tf;
      }
      
      if (!transformersLib) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
    }
    
    if (!transformersLib) {
      console.log('⚠️ AI model not available - using fallback report');
      createBasicBugReport();
      return;
    }
    
    console.log('✅ Transformers library found, generating AI-enhanced report...');
    // Store globally for use in other functions
    window.transformersLib = transformersLib;
    
    // Start bug report generation
    createBugReport().then(report => {
      console.log('📋 Sending bug report to popup...');
      chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
    }).catch(error => {
      console.error('❌ Bug report generation failed:', error);
      chrome.runtime.sendMessage({ 
        type: 'bugReportData', 
        report: `## Bug Report Generation Failed\n\n**Error:** ${error.message}\n\n**URL:** ${window.location.href}\n\n**Timestamp:** ${new Date().toISOString()}`
      });
    });
    
  } catch (error) {
    console.error('❌ AI initialization failed:', error);
    // Fallback to basic report
    createBasicBugReport();
  }
}

// Initialize the AI model
async function initializeClassifier() {
  if (classifier || isInitializing) return classifier;
  
  isInitializing = true;
  try {
    console.log('🤖 Loading AI model for bug analysis...');
    
    // Use the detected transformers library
    const transformersLib = window.transformersLib;
    if (!transformersLib || !transformersLib.pipeline) {
      console.error('❌ Transformers library not available');
      return null;
    }
    
    classifier = await transformersLib.pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
    console.log('✅ AI model loaded successfully');
    return classifier;
  } catch (error) {
    console.error('❌ Failed to load AI model:', error);
    return null;
  } finally {
    isInitializing = false;
  }
}

// Smart header generation using AI
async function generateSmartHeader(pageContent, errors, url) {
  try {
    const clf = await initializeClassifier();
    if (!clf) return fallbackHeader(url, errors);

    // Combine page content and errors for analysis
    const analysisText = `
      URL: ${url}
      Page Title: ${document.title}
      Content: ${pageContent.slice(0, 300)}
      Errors: ${errors.join(' ')}
    `.trim();

    // Categories for classification
    const categories = [
      'HTTP error page',
      'JavaScript runtime error', 
      'Form validation failure',
      'Authentication problem',
      'Network connection issue',
      'Page loading timeout',
      'Database error',
      'API service error',
      'User interface bug',
      'Payment processing error'
    ];

    const result = await clf(analysisText, categories);
    const topCategory = result.labels[0];
    const confidence = (result.scores[0] * 100).toFixed(0);

    // Generate contextual header
    return `## ${topCategory} (${confidence}% confidence)`;

  } catch (error) {
    console.error('AI analysis failed:', error);
    return fallbackHeader(url, errors);
  }
}

// Fallback header generation (pattern-based)
function fallbackHeader(url, errors) {
  // HTTP error patterns
  if (url.includes('error') || document.title.toLowerCase().includes('error')) {
    return '## HTTP Error Page';
  }
  
  // Console error patterns
  if (errors.some(error => error.includes('TypeError'))) {
    return '## JavaScript TypeError Detected';
  }
  
  if (errors.some(error => error.includes('ReferenceError'))) {
    return '## JavaScript ReferenceError';
  }

  // URL-based detection
  if (url.includes('microsoft.com') || url.includes('office.com')) {
    return '## Microsoft Service Issue';
  }
  
  if (url.includes('github.com')) {
    return '## GitHub Platform Issue';
  }

  // Generic fallback
  return '## Page Issue Report';
}

// Enhanced context analysis
async function analyzePageContext(pageContent) {
  try {
    const clf = await initializeClassifier();
    if (!clf) return { severity: 'unknown', context: 'Unable to analyze' };

    // Analyze severity
    const severityResult = await clf(pageContent, ['critical error', 'warning', 'minor issue', 'informational']);
    
    // Analyze issue type context
    const contextResult = await clf(pageContent, [
      'user authentication failed',
      'network connectivity problem', 
      'server internal error',
      'form data validation issue',
      'page content loading problem',
      'user interface broken'
    ]);

    return {
      severity: severityResult.labels[0],
      severityConfidence: (severityResult.scores[0] * 100).toFixed(0),
      context: contextResult.labels[0],
      contextConfidence: (contextResult.scores[0] * 100).toFixed(0)
    };

  } catch (error) {
    return { severity: 'unknown', context: 'Analysis failed' };
  }
}

// Get captured console logs
function getConsoleLogs() {
  // Return existing logs or start capturing
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

// Main bug report creation with AI enhancement
async function createBugReport() {
  console.log('📊 Creating AI-enhanced bug report...');
  
  const url = window.location.href;
  const pageContent = document.body.innerText.slice(0, 1000); // First 1000 chars
  const consoleLogs = getConsoleLogs(); // Now returns synchronously
  const domErrors = getDomErrors();
  
  // Generate AI-powered smart header
  const smartHeader = await generateSmartHeader(pageContent, domErrors, url);
  
  // Analyze page context with AI
  const context = await analyzePageContext(pageContent);
  
  // Build enhanced report
  let report = `${smartHeader}\n\n`;
  
  // Add AI analysis section
  report += 'AI Analysis\n';
  report += `Issue Severity: ${context.severity} (${context.severityConfidence}% confidence)\n`;
  report += `Issue Context: ${context.context} (${context.contextConfidence}% confidence)\n\n`;
  
  // Add URL
  report += `URL: ${url}\n`;
  report += `Page Title: ${document.title}\n`;
  report += `Timestamp: ${new Date().toISOString()}\n\n`;

  // Console logs section
  report += 'Console Activity\n';
  if (consoleLogs.length > 0) {
    consoleLogs.forEach(log => {
      report += `[${log.method.toUpperCase()}] ${log.args.join(' ')}\n`;
    });
  } else {
    report += 'No console activity detected.\n';
  }
  report += '\n';

  // DOM errors section  
  report += 'Page Issues\n';
  if (domErrors.length > 0) {
    domErrors.forEach(error => {
      report += `- ${error}\n`;
    });
  } else {
    report += 'No obvious page issues found.\n';
  }
  
  return report;
}

// Fallback basic bug report (no AI)
function createBasicBugReport() {
  const url = window.location.href;
  const domErrors = getDomErrors();
  
  let report = fallbackHeader(url, domErrors) + '\n\n';
  report += `URL: ${url}\n`;
  report += `Page Title: ${document.title}\n`;
  report += `Timestamp: ${new Date().toISOString()}\n\n`;
  report += 'Page Issues\n';
  
  if (domErrors.length > 0) {
    domErrors.forEach(error => {
      report += `- ${error}\n`;
    });
  } else {
    report += 'No obvious page issues found.\n';
  }
  
  chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
}