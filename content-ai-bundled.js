// Self-contained AI-enhanced bug reporter using bundled Transformers.js
// This script includes the transformers library inline and performs smart bug analysis

// Prevent duplicate execution
(function() {
  if (window.bugReporterInitialized) {
    console.log('🔄 Bug reporter already initialized, skipping...');
    return;
  }
  window.bugReporterInitialized = true;

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

// Global classifier instance - use window scope to avoid redeclaration
window.bugReporterClassifier = window.bugReporterClassifier || null;
window.bugReporterInitializing = window.bugReporterInitializing || false;

// Check for Transformers.js availability and initialize
console.log('🔧 Checking for Transformers.js availability...');

// Wait a moment for injected transformers to be available, then initialize
setTimeout(() => {
  // Check if transformers is available in various global forms
  let transformersLib = null;
  
  if (typeof window.transformers !== 'undefined') {
    transformersLib = window.transformers;
    console.log('📦 Found window.transformers');
  } else if (typeof window.Transformers !== 'undefined') {
    transformersLib = window.Transformers; 
    console.log('📦 Found window.Transformers');
  } else if (typeof transformers !== 'undefined') {
    transformersLib = transformers;
    console.log('📦 Found global transformers');
  }
  
  if (transformersLib) {
    console.log('✅ Transformers.js available, proceeding with AI analysis');
    window.transformersLib = transformersLib;
    initializeAIBugReporter();
  } else {
    console.log('⚠️ Transformers.js not available, using pattern analysis');
    initializeAIBugReporter(); // Will use fallback methods
  }
}, 1000); // Give time for injection

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
  if (window.bugReporterClassifier || window.bugReporterInitializing) return window.bugReporterClassifier;
  
  window.bugReporterInitializing = true;
  try {
    console.log('🤖 Loading AI model for bug analysis...');
    console.log('⏳ This may take 30 seconds to 2 minutes on first use to download the model...');
    
    // Use the detected transformers library
    const transformersLib = window.transformersLib;
    if (!transformersLib || !transformersLib.pipeline) {
      console.error('❌ Transformers library not available');
      return null;
    }
    
    // Add progress logging
    const startTime = Date.now();
    console.log('📥 Downloading AI model from Hugging Face...');
    
    // Try multiple models in order of preference (fast to comprehensive)
    const modelOptions = [
      'Xenova/distilbert-base-uncased-mnli',  // Main model
      'Xenova/mobilebert-uncased-mnli',       // Smaller fallback
      'Xenova/bart-large-mnli'                // Alternative
    ];
    
    let modelLoaded = false;
    for (const model of modelOptions) {
      try {
        console.log(`📦 Attempting to load model: ${model}`);
        
        window.bugReporterClassifier = await Promise.race([
          transformersLib.pipeline(
            'zero-shot-classification', 
            model,
            {
              progress_callback: (progress) => {
                if (progress.status === 'downloading') {
                  console.log(`📥 ${model}: ${progress.name} - ${Math.round(progress.progress || 0)}%`);
                } else if (progress.status === 'loading') {
                  console.log(`🔄 Loading: ${progress.name}`);
                }
              }
            }
          ),
          // Add timeout per model attempt
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model load timeout')), 60000)
          )
        ]);
        
        console.log(`✅ Successfully loaded model: ${model}`);
        modelLoaded = true;
        break;
        
      } catch (error) {
        console.log(`⚠️ Failed to load ${model}: ${error.message}`);
        if (error.message === 'Model load timeout') {
          console.log('⏰ Model download taking too long, trying next option...');
        }
        continue;
      }
    }
    
    if (!modelLoaded) {
      throw new Error('All AI models failed to load');
    }
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ AI model loaded successfully in ${loadTime} seconds`);
    return window.bugReporterClassifier;
    
  } catch (error) {
    console.error('❌ Failed to load AI model:', error);
    console.log('💡 Tip: Check your internet connection. Model downloads from Hugging Face.');
    return null;
  } finally {
    window.bugReporterInitializing = false;
  }
}

// Smart header generation using AI
async function generateSmartHeader(pageContent, errors, url) {
  try {
    const clf = await initializeClassifier();
    if (!clf) {
      console.log('🔄 AI unavailable, using enhanced pattern-based analysis...');
      return enhancedFallbackHeader(url, errors, pageContent);
    }

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
    return enhancedFallbackHeader(url, errors, pageContent);
  }
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

// Simple fallback header generation
function fallbackHeader(url, errors) {
  return enhancedFallbackHeader(url, errors, document.body.innerText.slice(0, 500));
}

// Enhanced context analysis
async function analyzePageContext(pageContent) {
  try {
    const clf = await initializeClassifier();
    if (!clf) {
      console.log('🔄 Using pattern-based context analysis...');
      return analyzeContextWithPatterns(pageContent);
    }

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
      contextConfidence: (contextResult.scores[0] * 100).toFixed(0),
      analysisType: 'AI-powered'
    };

  } catch (error) {
    console.log('🔄 AI context analysis failed, using patterns...');
    return analyzeContextWithPatterns(pageContent);
  }
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
  
  // Add analysis section
  const analysisTitle = context.analysisType === 'AI-powered' ? 'AI Analysis' : 'Pattern Analysis';
  report += `${analysisTitle}\n`;
  report += `Issue Severity: ${context.severity} (${context.severityConfidence}% confidence)\n`;
  report += `Issue Context: ${context.context} (${context.contextConfidence}% confidence)\n`;
  report += `Analysis Type: ${context.analysisType}\n\n`;
  
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

})(); // Close the IIFE that prevents duplicate execution