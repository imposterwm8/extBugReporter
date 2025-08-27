class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: {},
      vitals: {},
      resources: [],
      longTasks: [],
      navigation: {},
      memory: {},
      networkFailures: [],
      slowInteractions: [],
      renderBlocking: []
    };
    this.startTime = performance.now();
    this.observers = [];
    this.isMonitoring = false;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    await this.setupObservers();
    this.collectNavigationTiming();
    this.collectResourceTiming();
    this.monitorMemoryUsage();
    this.detectNetworkIssues();
    this.monitorSlowInteractions();
    
    return this.metrics;
  }

  async setupObservers() {
    try {
      if ('PerformanceObserver' in window) {
        this.observeLongTasks();
        this.observeLayoutShifts();
        this.observeLargestContentfulPaint();
        this.observeFirstInput();
        this.observeResourceLoadTimes();
      }
      
      if ('ReportingObserver' in window) {
        this.observeDeprecationWarnings();
      }
      
    } catch (error) {
      console.warn('Performance observers not fully supported');
    }
  }

  observeLongTasks() {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
          attribution: entry.attribution?.[0]?.name || 'unknown',
          impact: entry.duration > 50 ? 'critical' : 'moderate'
        });
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
    this.observers.push(observer);
  }

  observeLayoutShifts() {
    if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift')) return;
    
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      this.metrics.vitals.cls = {
        value: clsValue,
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
        entries: list.getEntries().length
      };
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  observeLargestContentfulPaint() {
    if (!PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) return;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.vitals.lcp = {
        value: lastEntry.startTime,
        rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
        element: lastEntry.element?.tagName || 'unknown',
        url: lastEntry.url || 'unknown'
      };
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  observeFirstInput() {
    if (!PerformanceObserver.supportedEntryTypes.includes('first-input')) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.vitals.fid = {
          value: entry.processingStart - entry.startTime,
          rating: entry.processingStart - entry.startTime < 100 ? 'good' : entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor',
          eventType: entry.name,
          target: entry.target?.tagName || 'unknown'
        };
      }
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  observeResourceLoadTimes() {
    if (!PerformanceObserver.supportedEntryTypes.includes('resource')) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) { // Resources taking > 1 second
          this.metrics.resources.push({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize || 0,
            type: this.getResourceType(entry.name),
            renderBlocking: entry.renderBlockingStatus === 'blocking',
            timing: {
              dns: entry.domainLookupEnd - entry.domainLookupStart,
              connection: entry.connectEnd - entry.connectStart,
              ttfb: entry.responseStart - entry.requestStart,
              download: entry.responseEnd - entry.responseStart
            }
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  observeDeprecationWarnings() {
    const observer = new ReportingObserver((reports) => {
      for (const report of reports) {
        if (report.type === 'deprecation') {
          this.metrics.networkFailures.push({
            type: 'deprecation',
            message: report.body.message,
            sourceFile: report.body.sourceFile,
            lineNumber: report.body.lineNumber
          });
        }
      }
    });
    
    observer.observe();
    this.observers.push(observer);
  }

  collectNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;
    
    this.metrics.navigation = {
      pageLoadTime: navigation.loadEventEnd - navigation.navigationStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      timeToInteractive: this.estimateTimeToInteractive(navigation),
      redirects: navigation.redirectCount,
      timing: {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        connection: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        domProcessing: navigation.domComplete - navigation.domLoading,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      },
      issues: []
    };

    // Identify performance issues
    if (this.metrics.navigation.timing.dns > 200) {
      this.metrics.navigation.issues.push('Slow DNS lookup (>200ms)');
    }
    
    if (this.metrics.navigation.timing.connection > 1000) {
      this.metrics.navigation.issues.push('Slow connection establishment (>1s)');
    }
    
    if (this.metrics.navigation.pageLoadTime > 3000) {
      this.metrics.navigation.issues.push('Slow page load (>3s)');
    }
    
    if (navigation.redirectCount > 2) {
      this.metrics.navigation.issues.push(`Excessive redirects (${navigation.redirectCount})`);
    }
  }

  collectResourceTiming() {
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    let renderBlockingResources = 0;
    
    for (const resource of resources) {
      totalSize += resource.transferSize || 0;
      
      if (resource.renderBlockingStatus === 'blocking') {
        renderBlockingResources++;
        this.metrics.renderBlocking.push({
          name: resource.name,
          duration: resource.duration,
          type: this.getResourceType(resource.name)
        });
      }
      
      // Track slow resources
      if (resource.duration > 2000) {
        this.metrics.resources.push({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize || 0,
          type: this.getResourceType(resource.name),
          issue: 'slow-resource'
        });
      }
    }
    
    this.metrics.pageLoad = {
      totalResources: resources.length,
      totalSize,
      renderBlockingResources,
      issues: []
    };
    
    if (totalSize > 5 * 1024 * 1024) { // >5MB
      this.metrics.pageLoad.issues.push(`Large page size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    }
    
    if (renderBlockingResources > 10) {
      this.metrics.pageLoad.issues.push(`Too many render-blocking resources (${renderBlockingResources})`);
    }
  }

  monitorMemoryUsage() {
    if ('memory' in performance) {
      this.metrics.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1),
        issues: []
      };
      
      if (this.metrics.memory.usage > 80) {
        this.metrics.memory.issues.push('High memory usage (>80%)');
      }
      
      // Monitor for memory leaks by checking growth over time
      setTimeout(() => {
        if (performance.memory.usedJSHeapSize > this.metrics.memory.used * 1.5) {
          this.metrics.memory.issues.push('Potential memory leak detected');
        }
      }, 10000);
    }
  }

  detectNetworkIssues() {
    // Monitor for failed requests
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        if (!response.ok) {
          this.metrics.networkFailures.push({
            url: args[0],
            status: response.status,
            duration,
            type: 'fetch-error'
          });
        } else if (duration > 5000) {
          this.metrics.networkFailures.push({
            url: args[0],
            duration,
            type: 'slow-request',
            status: response.status
          });
        }
        
        return response;
      } catch (error) {
        this.metrics.networkFailures.push({
          url: args[0],
          error: error.message,
          duration: performance.now() - start,
          type: 'network-error'
        });
        throw error;
      }
    };
    
    XMLHttpRequest.prototype.open = function(...args) {
      const start = performance.now();
      const originalSend = this.send;
      
      this.send = function(...sendArgs) {
        this.addEventListener('loadend', () => {
          const duration = performance.now() - start;
          if (this.status >= 400) {
            this.metrics.networkFailures.push({
              url: args[1],
              status: this.status,
              duration,
              type: 'xhr-error'
            });
          }
        });
        
        return originalSend.apply(this, sendArgs);
      };
      
      return originalXHROpen.apply(this, args);
    };
  }

  monitorSlowInteractions() {
    const interactionStartTimes = new Map();
    
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const startTime = performance.now();
        interactionStartTimes.set(event, startTime);
        
        // Monitor for slow responses
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (duration > 100) { // >100ms to respond
              this.metrics.slowInteractions.push({
                type: eventType,
                target: event.target?.tagName || 'unknown',
                duration,
                timestamp: startTime
              });
            }
            
            interactionStartTimes.delete(event);
          });
        });
      }, { passive: true });
    });
  }

  estimateTimeToInteractive(navigation) {
    // Simplified TTI estimation
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
    const hasLongTasks = this.metrics.longTasks.length > 0;
    
    if (hasLongTasks) {
      const lastLongTask = Math.max(...this.metrics.longTasks.map(task => task.startTime + task.duration));
      return Math.max(domContentLoaded, lastLongTask);
    }
    
    return domContentLoaded;
  }

  getResourceType(url) {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  generatePerformanceReport() {
    const issues = [];
    let score = 100;

    // Analyze Core Web Vitals
    if (this.metrics.vitals.lcp?.rating === 'poor') {
      issues.push(`Poor LCP: ${this.metrics.vitals.lcp.value.toFixed(0)}ms (should be <2.5s)`);
      score -= 20;
    }
    
    if (this.metrics.vitals.fid?.rating === 'poor') {
      issues.push(`Poor FID: ${this.metrics.vitals.fid.value.toFixed(0)}ms (should be <100ms)`);
      score -= 15;
    }
    
    if (this.metrics.vitals.cls?.rating === 'poor') {
      issues.push(`Poor CLS: ${this.metrics.vitals.cls.value.toFixed(3)} (should be <0.1)`);
      score -= 15;
    }

    // Analyze long tasks
    if (this.metrics.longTasks.length > 0) {
      const criticalLongTasks = this.metrics.longTasks.filter(task => task.impact === 'critical').length;
      issues.push(`${this.metrics.longTasks.length} long tasks found (${criticalLongTasks} critical)`);
      score -= Math.min(25, this.metrics.longTasks.length * 3);
    }

    // Analyze network issues
    if (this.metrics.networkFailures.length > 0) {
      issues.push(`${this.metrics.networkFailures.length} network issues detected`);
      score -= Math.min(20, this.metrics.networkFailures.length * 5);
    }

    // Analyze resource loading
    if (this.metrics.renderBlocking.length > 5) {
      issues.push(`${this.metrics.renderBlocking.length} render-blocking resources`);
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      metrics: this.metrics,
      recommendations: this.generateRecommendations(issues)
    };
  }

  generateRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('LCP'))) {
      recommendations.push('Optimize Largest Contentful Paint: compress images, lazy load below-fold content, improve server response times');
    }
    
    if (issues.some(issue => issue.includes('long tasks'))) {
      recommendations.push('Break up long tasks: use setTimeout, requestIdleCallback, or Web Workers for heavy computations');
    }
    
    if (issues.some(issue => issue.includes('render-blocking'))) {
      recommendations.push('Reduce render-blocking resources: defer non-critical JavaScript, inline critical CSS');
    }
    
    if (issues.some(issue => issue.includes('network'))) {
      recommendations.push('Fix network issues: implement proper error handling, add request timeouts, optimize API calls');
    }
    
    return recommendations;
  }

  stopMonitoring() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}