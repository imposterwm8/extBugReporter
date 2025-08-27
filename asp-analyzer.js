class ASPNETAnalyzer {
  constructor() {
    this.aspIndicators = {
      detected: false,
      version: 'unknown',
      viewStateIssues: [],
      sessionIssues: [],
      postbackIssues: [],
      serverErrors: [],
      formAuthentication: false,
      resources: []
    };
  }

  async analyzeASPNET() {
    this.detectASPNET();
    this.analyzeViewState();
    this.analyzeWebForms();
    this.analyzeServerErrors();
    this.analyzeASPResources();
    this.analyzeAuthentication();
    this.detectCommonIssues();
    
    return this.generateReport();
  }

  detectASPNET() {
    const indicators = {
      viewstate: document.querySelector('input[name="__VIEWSTATE"]'),
      eventvalidation: document.querySelector('input[name="__EVENTVALIDATION"]'),
      dopostback: window.__doPostBack,
      webforms: document.querySelector('form[method="post"]'),
      aspnet_ajax: window.Sys || window.WebForm_DoPostBackWithOptions,
      aspnet_scripts: document.querySelector('script[src*="WebResource.axd"]')
    };

    if (indicators.viewstate || indicators.eventvalidation || indicators.dopostback) {
      this.aspIndicators.detected = true;
      this.aspIndicators.version = 'Web Forms';
    }

    if (indicators.aspnet_ajax) {
      this.aspIndicators.version += ' with AJAX';
    }

    // Check for ASP.NET Core indicators
    const coreIndicators = {
      antiforgery: document.querySelector('input[name="__RequestVerificationToken"]'),
      blazor: window.Blazor,
      signalr: window.signalR
    };

    if (coreIndicators.antiforgery && !indicators.viewstate) {
      this.aspIndicators.version = 'ASP.NET Core';
    }
  }

  analyzeViewState() {
    const viewStateInput = document.querySelector('input[name="__VIEWSTATE"]');
    if (!viewStateInput) return;

    const viewStateValue = viewStateInput.value;
    const viewStateSize = new Blob([viewStateValue]).size;

    if (viewStateSize > 100000) { // >100KB
      this.aspIndicators.viewStateIssues.push({
        type: 'Large ViewState',
        size: `${(viewStateSize / 1024).toFixed(1)}KB`,
        issue: 'ViewState is unusually large - may impact performance'
      });
    }

    if (viewStateSize > 500000) { // >500KB
      this.aspIndicators.viewStateIssues.push({
        type: 'Critical ViewState Size',
        size: `${(viewStateSize / 1024).toFixed(1)}KB`,
        issue: 'ViewState exceeds recommended limits - serious performance impact'
      });
    }

    // Check if ViewState is disabled when it should be
    if (viewStateValue === '') {
      this.aspIndicators.viewStateIssues.push({
        type: 'Empty ViewState',
        issue: 'ViewState may be disabled - could cause postback issues'
      });
    }
  }

  analyzeWebForms() {
    const forms = document.querySelectorAll('form[method="post"]');
    
    forms.forEach((form, index) => {
      const formAnalysis = {
        formIndex: index,
        action: form.action,
        issues: []
      };

      // Check for missing action
      if (!form.action || form.action === window.location.href) {
        formAnalysis.issues.push('Form posts back to same page - typical Web Forms pattern');
      }

      // Check for postback issues
      const postbackControls = form.querySelectorAll('[onclick*="__doPostBack"]');
      if (postbackControls.length > 10) {
        formAnalysis.issues.push(`High number of postback controls (${postbackControls.length}) - may impact performance`);
      }

      // Check for validation
      const validators = form.querySelectorAll('[id*="Validator"], .validator');
      if (validators.length === 0 && form.querySelectorAll('input, select, textarea').length > 3) {
        formAnalysis.issues.push('No client validation detected on complex form');
      }

      if (formAnalysis.issues.length > 0) {
        this.aspIndicators.postbackIssues.push(formAnalysis);
      }
    });
  }

  analyzeServerErrors() {
    const errorIndicators = [
      // ASP.NET error patterns in content
      { pattern: /server error in/i, type: 'ASP.NET Server Error' },
      { pattern: /compilation error/i, type: 'Compilation Error' },
      { pattern: /parser error/i, type: 'Parser Error' },
      { pattern: /configuration error/i, type: 'Configuration Error' },
      { pattern: /system\.web\.httpexception/i, type: 'HTTP Exception' },
      { pattern: /yellow screen of death/i, type: 'YSOD Error' },
      { pattern: /\[SqlException\]/i, type: 'Database Error' },
      { pattern: /viewstate.*invalid/i, type: 'ViewState Error' }
    ];

    const pageText = document.body.innerText.toLowerCase();
    
    errorIndicators.forEach(indicator => {
      if (indicator.pattern.test(pageText)) {
        this.aspIndicators.serverErrors.push({
          type: indicator.type,
          detected: true,
          context: this.extractErrorContext(pageText, indicator.pattern)
        });
      }
    });

    // Check for ASP.NET error pages
    const errorElements = [
      document.querySelector('#header h1'), // Standard ASP.NET error header
      document.querySelector('.error-details'), // Error detail sections
      document.querySelector('#stack-trace') // Stack trace sections
    ];

    errorElements.forEach(element => {
      if (element && element.textContent.includes('Server Error')) {
        this.aspIndicators.serverErrors.push({
          type: 'Server Error Page',
          element: element.tagName,
          text: element.textContent.slice(0, 200)
        });
      }
    });
  }

  analyzeASPResources() {
    // Check for ASP.NET specific resources
    const scripts = document.querySelectorAll('script[src]');
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');

    [...scripts, ...stylesheets].forEach(resource => {
      const src = resource.src || resource.href;
      if (!src) return;

      if (src.includes('WebResource.axd')) {
        this.aspIndicators.resources.push({
          type: 'WebResource.axd',
          url: src,
          issue: 'Check if resource is being served efficiently'
        });
      }

      if (src.includes('ScriptResource.axd')) {
        this.aspIndicators.resources.push({
          type: 'ScriptResource.axd',
          url: src,
          issue: 'ASP.NET AJAX script resource - ensure bundling is optimized'
        });
      }

      if (src.includes('.asp') || src.includes('.aspx')) {
        this.aspIndicators.resources.push({
          type: 'ASP Resource',
          url: src,
          element: resource.tagName
        });
      }
    });
  }

  analyzeAuthentication() {
    // Check for Forms Authentication indicators
    const authIndicators = {
      loginForm: document.querySelector('input[name*="Login"], input[name*="login"]'),
      authCookie: document.cookie.includes('.ASPXAUTH'),
      loginUrl: window.location.href.includes('login'),
      authRedirect: document.querySelector('meta[http-equiv*="refresh"]')
    };

    if (authIndicators.loginForm || authIndicators.authCookie || authIndicators.loginUrl) {
      this.aspIndicators.formAuthentication = true;
    }

    // Check for authentication issues
    if (authIndicators.authRedirect && !authIndicators.loginForm) {
      this.aspIndicators.sessionIssues.push({
        type: 'Authentication Redirect',
        issue: 'Page may be redirecting due to authentication timeout'
      });
    }
  }

  detectCommonIssues() {
    // Check for session timeout indicators
    if (document.body.innerText.toLowerCase().includes('session expired') || 
        document.body.innerText.toLowerCase().includes('session timeout')) {
      this.aspIndicators.sessionIssues.push({
        type: 'Session Timeout',
        issue: 'Session has expired - user needs to re-authenticate'
      });
    }

    // Check for postback issues
    if (window.location.href.includes('__EVENTARGUMENT') || 
        window.location.href.includes('__EVENTTARGET')) {
      this.aspIndicators.postbackIssues.push({
        type: 'Postback in URL',
        issue: 'Postback parameters in URL - may indicate form handling issues'
      });
    }

    // Check for validation issues
    const validationSummary = document.querySelector('.validation-summary-errors, [id*="ValidationSummary"]');
    if (validationSummary && validationSummary.style.display !== 'none') {
      this.aspIndicators.postbackIssues.push({
        type: 'Validation Errors',
        issue: 'Form validation errors are currently displayed',
        errors: validationSummary.textContent.trim()
      });
    }
  }

  extractErrorContext(text, pattern) {
    const match = text.match(pattern);
    if (!match) return '';
    
    const index = match.index;
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + 200);
    
    return text.slice(start, end).trim();
  }

  generateReport() {
    if (!this.aspIndicators.detected) {
      return {
        detected: false,
        message: 'No ASP.NET indicators detected'
      };
    }

    const report = {
      detected: true,
      version: this.aspIndicators.version,
      issues: [],
      recommendations: [],
      summary: ''
    };

    // Compile issues
    let totalIssues = 0;

    if (this.aspIndicators.viewStateIssues.length > 0) {
      totalIssues += this.aspIndicators.viewStateIssues.length;
      report.issues.push(...this.aspIndicators.viewStateIssues);
      report.recommendations.push('Optimize ViewState usage - consider disabling for read-only pages');
    }

    if (this.aspIndicators.serverErrors.length > 0) {
      totalIssues += this.aspIndicators.serverErrors.length;
      report.issues.push(...this.aspIndicators.serverErrors);
      report.recommendations.push('Address server-side errors visible in browser');
    }

    if (this.aspIndicators.postbackIssues.length > 0) {
      totalIssues += this.aspIndicators.postbackIssues.length;
      report.issues.push(...this.aspIndicators.postbackIssues);
      report.recommendations.push('Review postback patterns - consider AJAX or client-side alternatives');
    }

    if (this.aspIndicators.sessionIssues.length > 0) {
      totalIssues += this.aspIndicators.sessionIssues.length;
      report.issues.push(...this.aspIndicators.sessionIssues);
      report.recommendations.push('Review session management and timeout settings');
    }

    if (this.aspIndicators.resources.length > 5) {
      report.issues.push({
        type: 'Resource Count',
        count: this.aspIndicators.resources.length,
        issue: 'High number of ASP.NET resources - consider bundling'
      });
      report.recommendations.push('Implement resource bundling and minification');
    }

    // Generate summary
    if (totalIssues === 0) {
      report.summary = `ASP.NET ${this.aspIndicators.version} application appears healthy`;
    } else {
      report.summary = `ASP.NET ${this.aspIndicators.version} application has ${totalIssues} potential issues`;
    }

    return report;
  }
}

if (typeof window !== 'undefined') {
  window.ASPNETAnalyzer = ASPNETAnalyzer;
}