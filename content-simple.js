(function() {
  if (window.bugReporterInitialized) {
    console.log('🔄 Bug reporter already initialized, skipping...');
    return;
  }
  window.bugReporterInitialized = true;

window.capturedLogs = window.capturedLogs || [];
function setupConsoleCapture() {
  if (window.consoleHooked) return window.capturedLogs;
  
  const logs = [];
  const originalConsole = {};
  const methods = ['log', 'warn', 'error', 'info', 'debug'];
  let captureActive = true;

  methods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = (...args) => {
      originalConsole[method](...args);
      
      if (captureActive) {
        const logText = args.join(' ').toLowerCase();
        
        if (logText.includes('starting bug report') || logText.includes('initializing ai')) {
          captureActive = false;
          return;
        }
        
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
  setTimeout(() => { captureActive = false; }, 2000);
  return logs;
}

setupConsoleCapture();
initializeAIBugReporter();
async function initializeAIBugReporter() {
  try {
    const settings = await chrome.storage.sync.get({
      aiMode: 'gemini',
      geminiApiKey: ''
    });
    
    if (settings.aiMode === 'gemini' && settings.geminiApiKey && settings.geminiApiKey.trim()) {
      await createGeminiEnhancedReport(settings.geminiApiKey.trim());
    } else {
      createPatternBugReport();
    }
    
  } catch (error) {
    createPatternBugReport();
  }
}

async function createGeminiEnhancedReport(apiKey) {
  try {
    if (!window.GeminiBugAnalyzer) {
      throw new Error('Gemini analyzer not available - script injection failed');
    }
    
    const analyzer = new window.GeminiBugAnalyzer(apiKey);
    
    let performanceData = null;
    if (window.PerformanceMonitor) {
      const monitor = new window.PerformanceMonitor();
      await monitor.startMonitoring();
      
      // Give it time to collect performance data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      performanceData = monitor.generatePerformanceReport();
      monitor.stopMonitoring();
    }

    const pageData = {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText.slice(0, 2000),
      consoleErrors: getConsoleLogs(),
      domErrors: getDomErrors(),
      performanceData: performanceData,
      timestamp: new Date().toISOString()
    };
    
    let reactAnalysis = null;
    let advancedReactAnalysis = null;
    
    if (window.ReactQAAnalyzer) {
      const reactAnalyzer = new window.ReactQAAnalyzer();
      reactAnalysis = await reactAnalyzer.analyzeReactApp();
      
      if (reactAnalysis && reactAnalysis.reactInfo.detected && window.ReactAdvancedAnalyzer) {
        const advancedAnalyzer = new window.ReactAdvancedAnalyzer();
        advancedReactAnalysis = await advancedAnalyzer.analyzeAdvancedReact();
      }
    }
    
    const analysis = await analyzer.analyzeBugReport(pageData);
    
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
    
    if (reactAnalysis && reactAnalysis.reactInfo.detected) {
      report += `### ⚛️ React Analysis\n`;
      report += `**React Version:** ${reactAnalysis.reactInfo.version}\n`;
      report += `**Mode:** ${reactAnalysis.reactInfo.mode}\n`;
      report += `**DevTools:** ${reactAnalysis.reactInfo.devTools ? 'Available' : 'Not Found'}\n`;
      report += `**Components:** ${reactAnalysis.components.totalComponents} (${reactAnalysis.components.functionalComponents} functional, ${reactAnalysis.components.classComponents} class)\n`;
      report += `**Performance Score:** ${reactAnalysis.performance.renderPerformance.totalRenderTime.toFixed(1)}ms total render time\n`;
      report += `**Accessibility Score:** ${reactAnalysis.accessibility.score}%\n\n`;
      
      if (reactAnalysis.recommendations.length > 0) {
        report += `**React Recommendations:**\n`;
        reactAnalysis.recommendations.slice(0, 3).forEach(rec => {
          const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          report += `${priority} ${rec.title}: ${rec.description}\n`;
        });
        report += '\n';
      }
      
      if (advancedReactAnalysis) {
        report += `### 🔬 Advanced React Analysis\n`;
        report += `**Memory Leak Risk:** ${advancedReactAnalysis.advancedPerformance.memoryLeaks.riskLevel}\n`;
        report += `**Hook Issues:** ${advancedReactAnalysis.advancedPerformance.hookDependencies.potentialIssues}\n`;
        
        if (advancedReactAnalysis.stateManagement.redux.detected) {
          report += `**Redux:** Detected\n`;
        }
        if (advancedReactAnalysis.stateManagement.context.providers > 0) {
          report += `**Context Providers:** ${advancedReactAnalysis.stateManagement.context.providers}\n`;
        }
        
        report += `**Error Boundaries:** ${advancedReactAnalysis.errorHandling.errorBoundaries}\n`;
        
        const testingFrameworks = Object.keys(advancedReactAnalysis.testing.frameworks).filter(key => advancedReactAnalysis.testing.frameworks[key]);
        if (testingFrameworks.length > 0) {
          report += `**Testing:** ${testingFrameworks.join(', ')}\n`;
        }
        
        const advancedRecs = [
          ...advancedReactAnalysis.advancedPerformance.recommendations,
          ...advancedReactAnalysis.stateManagement.recommendations,
          ...advancedReactAnalysis.errorHandling.recommendations
        ];
        
        if (advancedRecs.length > 0) {
          report += `\n**Advanced Recommendations:**\n`;
          advancedRecs.slice(0, 2).forEach(rec => {
            const priority = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : rec.priority === 'medium' ? '🟡' : '🟢';
            report += `${priority} ${rec.title}: ${rec.description}\n`;
          });
        }
        report += '\n';
      }
    }
    
    report += `**URL:** ${pageData.url}\n`;
    report += `**Page Title:** ${pageData.title}\n`;
    report += `**Timestamp:** ${pageData.timestamp}\n`;
    report += `**Analysis Type:** ${analysis.analysisType}\n\n`;
    
        report += addConsoleLogsSection(pageData.consoleErrors);
    report += addDomErrorsSection(pageData.domErrors);
    
    chrome.runtime.sendMessage({ type: 'bugReportData', report: report });
    
  } catch (error) {
    createPatternBugReport();
  }
}

function createPatternBugReport() {
  const url = window.location.href;
  const pageContent = document.body.innerText.slice(0, 1000);
  const consoleLogs = getConsoleLogs();
  const domErrors = getDomErrors();
  
  const smartHeader = enhancedFallbackHeader(url, domErrors, pageContent);
  
  const context = analyzeContextWithPatterns(pageContent);
  
  let report = `${smartHeader}\n\n`;
  
  const analysisTitle = 'Pattern Analysis';
  report += `### ${analysisTitle}\n`;
  report += `**Issue Severity:** ${context.severity} (${context.severityConfidence}% confidence)\n`;
  report += `**Issue Context:** ${context.context} (${context.contextConfidence}% confidence)\n`;
  report += `**Analysis Type:** ${context.analysisType}\n\n`;
  
  report += `**URL:** ${url}\n`;
  report += `**Page Title:** ${document.title}\n`;
  report += `**Timestamp:** ${new Date().toISOString()}\n\n`;

    report += addConsoleLogsSection(consoleLogs);
  report += addDomErrorsSection(domErrors);
  
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