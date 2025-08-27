
class ReactQAAnalyzer {
  constructor() {
    this.reactDetected = false;
    this.reactVersion = null;
    this.devToolsAvailable = false;
    this.performanceMetrics = {};
    this.componentIssues = [];
    this.accessibilityIssues = [];
  }

  // Main analysis entry point
  async analyzeReactApp() {
    const analysis = {
      reactInfo: await this.detectReact(),
      performance: await this.analyzePerformance(),
      components: await this.analyzeComponents(),
      accessibility: await this.analyzeAccessibility(),
      codeQuality: await this.analyzeCodeQuality(),
      bundles: await this.analyzeBundles(),
      recommendations: []
    };

    analysis.recommendations = this.generateRecommendations(analysis);
    return analysis;
  }

  // Detect React presence and version
  async detectReact() {
    const info = {
      detected: false,
      version: null,
      devTools: false,
      mode: null,
      features: []
    };

    try {
      // Check for React on window
      if (window.React) {
        info.detected = true;
        info.version = window.React.version || 'Unknown';
        info.features.push('React Global Available');
      }

      // Check for React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        info.devTools = true;
        info.features.push('React DevTools');
        
        // Get React instances from DevTools
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.renderers && hook.renderers.size > 0) {
          const renderer = hook.renderers.values().next().value;
          if (renderer && renderer.version) {
            info.version = renderer.version;
            info.detected = true;
          }
        }
      }

      // Check for React root elements
      const reactRoots = document.querySelectorAll('[data-reactroot], #root, #app, [id*="react"], [class*="react"]');
      if (reactRoots.length > 0) {
        info.detected = true;
        info.features.push(`${reactRoots.length} React Root Elements`);
      }

      // Check for React fiber
      const elementsWithFiber = Array.from(document.querySelectorAll('*')).filter(el => {
        return Object.keys(el).some(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
      });

      if (elementsWithFiber.length > 0) {
        info.detected = true;
        info.features.push(`${elementsWithFiber.length} Elements with React Fiber`);
      }

      // Detect development vs production
      if (info.detected) {
        info.mode = this.detectReactMode();
      }

      this.reactDetected = info.detected;
      this.reactVersion = info.version;
      this.devToolsAvailable = info.devTools;

    } catch (error) {
      // Silent error handling
    }

    return info;
  }

  // Detect React mode (development/production)
  detectReactMode() {
    try {
      // Check for development mode indicators
      if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        return 'development';
      }

      // Check for production optimizations
      if (document.querySelector('script[src*="react"][src*="production"]')) {
        return 'production';
      }

      // Check for minified React
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const hasMinifiedReact = scripts.some(script => 
        script.src.includes('react') && (script.src.includes('.min.') || script.src.includes('production'))
      );

      return hasMinifiedReact ? 'production' : 'development';
    } catch (error) {
      return 'unknown';
    }
  }

  // Analyze React performance
  async analyzePerformance() {
    const metrics = {
      renderCount: 0,
      expensiveRenders: [],
      memoryLeaks: [],
      unnecessaryRenders: [],
      profilerData: null
    };

    try {
      // Hook into React DevTools Profiler if available
      if (this.devToolsAvailable && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        // Collect profiler data
        if (hook.profilerStore) {
          metrics.profilerData = this.extractProfilerData(hook);
        }
      }

      // Check for React.Profiler components
      const profilerElements = document.querySelectorAll('[data-react-profiler]');
      if (profilerElements.length > 0) {
        metrics.profilerComponents = profilerElements.length;
      }

      // Analyze render performance using Performance API
      metrics.renderPerformance = this.analyzeRenderPerformance();

    } catch (error) {
      // Silent error handling
    }

    return metrics;
  }

  // Extract React DevTools profiler data
  extractProfilerData(hook) {
    try {
      const data = {
        components: [],
        renders: [],
        performance: {}
      };

      if (hook.getFiberRoots) {
        const fiberRoots = hook.getFiberRoots(1);
        fiberRoots.forEach(root => {
          if (root.current) {
            data.components.push(this.analyzeFiberNode(root.current));
          }
        });
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  // Analyze Fiber node for performance issues
  analyzeFiberNode(fiber) {
    const analysis = {
      type: fiber.elementType?.name || fiber.type?.name || 'Unknown',
      renderTime: fiber.actualDuration || 0,
      children: fiber.child ? 1 : 0,
      props: fiber.pendingProps ? Object.keys(fiber.pendingProps).length : 0,
      issues: []
    };

    // Check for expensive renders (>16ms)
    if (analysis.renderTime > 16) {
      analysis.issues.push(`Slow render: ${analysis.renderTime.toFixed(2)}ms`);
    }

    // Check for too many props
    if (analysis.props > 10) {
      analysis.issues.push(`Many props: ${analysis.props}`);
    }

    return analysis;
  }

  // Analyze render performance using Performance API
  analyzeRenderPerformance() {
    try {
      const marks = performance.getEntriesByType('mark');
      const measures = performance.getEntriesByType('measure');
      
      const reactMarks = marks.filter(mark => 
        mark.name.includes('⚛️') || mark.name.includes('React')
      );

      const reactMeasures = measures.filter(measure => 
        measure.name.includes('⚛️') || measure.name.includes('React')
      );

      return {
        marks: reactMarks.length,
        measures: reactMeasures.length,
        totalRenderTime: reactMeasures.reduce((sum, m) => sum + m.duration, 0)
      };
    } catch (error) {
      return { marks: 0, measures: 0, totalRenderTime: 0 };
    }
  }

  // Analyze React components
  async analyzeComponents() {
    const analysis = {
      totalComponents: 0,
      functionalComponents: 0,
      classComponents: 0,
      customHooks: 0,
      issues: []
    };

    try {
      // Find all React components in the DOM
      const elements = document.querySelectorAll('*');
      
      elements.forEach(element => {
        const reactProps = Object.keys(element).find(key => 
          key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
        );

        if (reactProps) {
          analysis.totalComponents++;
          
          const fiber = element[reactProps];
          if (fiber && fiber.elementType) {
            // Determine component type
            if (typeof fiber.elementType === 'function') {
              if (fiber.elementType.prototype && fiber.elementType.prototype.render) {
                analysis.classComponents++;
              } else {
                analysis.functionalComponents++;
              }
            }
          }
        }
      });

      // Check for common React anti-patterns
      analysis.issues = this.detectComponentIssues();

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Detect common React component issues
  detectComponentIssues() {
    const issues = [];

    try {
      // Check for missing keys in lists
      const listElements = document.querySelectorAll('[data-react-component*="map"], ul, ol');
      listElements.forEach(list => {
        const children = Array.from(list.children);
        if (children.length > 1 && children.some(child => !child.getAttribute('key'))) {
          issues.push({
            type: 'Missing Keys',
            element: list,
            description: 'List items may be missing React keys'
          });
        }
      });

      // Check for inline functions in JSX (potential performance issue)
      const elementsWithHandlers = document.querySelectorAll('[onclick], [onchange], [onsubmit]');
      if (elementsWithHandlers.length > 0) {
        issues.push({
          type: 'Inline Handlers',
          count: elementsWithHandlers.length,
          description: 'Consider moving inline event handlers to useCallback or class methods'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return issues;
  }

  // Analyze React accessibility
  async analyzeAccessibility() {
    const analysis = {
      ariaIssues: [],
      semanticIssues: [],
      keyboardIssues: [],
      score: 100
    };

    try {
      // Check for missing ARIA labels on interactive elements
      const interactiveElements = document.querySelectorAll('button, input, select, textarea, [role="button"], [tabindex]');
      
      interactiveElements.forEach(element => {
        if (!element.getAttribute('aria-label') && 
            !element.getAttribute('aria-labelledby') &&
            !element.textContent.trim() &&
            !element.getAttribute('title')) {
          analysis.ariaIssues.push({
            type: 'Missing ARIA Label',
            element: element.tagName,
            description: 'Interactive element lacks accessible label'
          });
        }
      });

      // Check for semantic HTML usage
      const divButtons = document.querySelectorAll('div[onclick], span[onclick]');
      if (divButtons.length > 0) {
        analysis.semanticIssues.push({
          type: 'Non-semantic Buttons',
          count: divButtons.length,
          description: 'Use <button> instead of <div> or <span> for clickable elements'
        });
      }

      // Calculate accessibility score
      const totalIssues = analysis.ariaIssues.length + analysis.semanticIssues.length;
      analysis.score = Math.max(0, 100 - (totalIssues * 5));

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Analyze React code quality
  async analyzeCodeQuality() {
    const analysis = {
      hookUsage: {},
      stateManagement: {},
      errorHandling: {},
      testability: {},
      recommendations: []
    };

    try {
      // Check for React hooks patterns
      analysis.hookUsage = this.analyzeHookUsage();
      
      // Check for state management patterns
      analysis.stateManagement = this.analyzeStateManagement();
      
      // Check for error boundaries
      analysis.errorHandling = this.analyzeErrorHandling();

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Analyze React hooks usage
  analyzeHookUsage() {
    const usage = {
      useState: 0,
      useEffect: 0,
      useContext: 0,
      customHooks: 0,
      issues: []
    };

    // This would need to analyze the source code, which is challenging from a content script
    // For now, we'll provide general guidance
    usage.issues.push({
      type: 'Hook Analysis',
      description: 'Use React DevTools for detailed hook inspection'
    });

    return usage;
  }

  // Analyze state management
  analyzeStateManagement() {
    const analysis = {
      contextProviders: 0,
      reduxStore: false,
      localState: 0,
      issues: []
    };

    try {
      // Check for Context Providers
      const providers = document.querySelectorAll('[data-react-component*="Provider"]');
      analysis.contextProviders = providers.length;

      // Check for Redux
      if (window.__REDUX_DEVTOOLS_EXTENSION__ || window.Redux) {
        analysis.reduxStore = true;
      }

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Analyze error handling
  analyzeErrorHandling() {
    const analysis = {
      errorBoundaries: 0,
      errorHandlers: 0,
      recommendations: []
    };

    try {
      // Look for error boundary patterns
      const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
      analysis.errorBoundaries = errorBoundaries.length;

      if (analysis.errorBoundaries === 0) {
        analysis.recommendations.push('Consider implementing Error Boundaries for better error handling');
      }

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Analyze bundle and performance
  async analyzeBundles() {
    const analysis = {
      bundleSize: 0,
      chunks: 0,
      caching: false,
      recommendations: []
    };

    try {
      // Analyze loaded scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const reactScripts = scripts.filter(script => 
        script.src.includes('react') || script.src.includes('bundle') || script.src.includes('chunk')
      );

      analysis.chunks = reactScripts.length;

      // Check for code splitting
      const hasChunks = scripts.some(script => 
        script.src.includes('chunk') || script.src.includes('split')
      );

      if (!hasChunks && analysis.chunks > 3) {
        analysis.recommendations.push('Consider implementing code splitting to reduce bundle size');
      }

      // Check for caching headers (approximation)
      if (scripts.some(script => script.src.includes('hash') || script.src.includes('v='))) {
        analysis.caching = true;
      } else {
        analysis.recommendations.push('Implement cache busting for better performance');
      }

    } catch (error) {
      // Silent error handling
    }

    return analysis;
  }

  // Generate comprehensive recommendations
  generateRecommendations(analysis) {
    const recommendations = [];

    // React-specific recommendations
    if (analysis.reactInfo.detected) {
      if (analysis.reactInfo.mode === 'development') {
        recommendations.push({
          priority: 'high',
          category: 'Performance',
          title: 'Switch to Production Build',
          description: 'Application is running in development mode. Use production build for better performance.'
        });
      }

      if (!analysis.reactInfo.devTools) {
        recommendations.push({
          priority: 'medium',
          category: 'Development',
          title: 'Install React DevTools',
          description: 'React DevTools provide valuable debugging and profiling capabilities.'
        });
      }
    }

    // Performance recommendations
    if (analysis.performance.renderPerformance.totalRenderTime > 100) {
      recommendations.push({
        priority: 'high',
        category: 'Performance',
        title: 'Optimize Render Performance',
        description: `Total render time: ${analysis.performance.renderPerformance.totalRenderTime.toFixed(2)}ms. Consider memoization and optimization.`
      });
    }

    // Accessibility recommendations
    if (analysis.accessibility.score < 80) {
      recommendations.push({
        priority: 'high',
        category: 'Accessibility',
        title: 'Improve Accessibility',
        description: `Accessibility score: ${analysis.accessibility.score}%. Address ARIA and semantic HTML issues.`
      });
    }

    // Component recommendations
    if (analysis.components.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Code Quality',
        title: 'Fix Component Issues',
        description: `Found ${analysis.components.issues.length} component issues including missing keys and inline handlers.`
      });
    }

    return recommendations;
  }

  // Generate formatted report
  generateReport(analysis) {
    let report = '## React QA Analysis Report\n\n';

    // React Information
    if (analysis.reactInfo.detected) {
      report += `### ⚛️ React Application Detected\n`;
      report += `**Version:** ${analysis.reactInfo.version}\n`;
      report += `**Mode:** ${analysis.reactInfo.mode}\n`;
      report += `**DevTools:** ${analysis.reactInfo.devTools ? '✅ Available' : '❌ Not Found'}\n`;
      report += `**Features:** ${analysis.reactInfo.features.join(', ')}\n\n`;
    } else {
      report += `### ❌ React Not Detected\n`;
      report += `This page does not appear to be a React application.\n\n`;
      return report;
    }

    // Performance Analysis
    report += `### 🚀 Performance Analysis\n`;
    if (analysis.performance.profilerData) {
      report += `**Components Analyzed:** ${analysis.performance.profilerData.components.length}\n`;
      report += `**Total Render Time:** ${analysis.performance.renderPerformance.totalRenderTime.toFixed(2)}ms\n`;
    }
    report += `**Performance Marks:** ${analysis.performance.renderPerformance.marks}\n`;
    report += `**Performance Measures:** ${analysis.performance.renderPerformance.measures}\n\n`;

    // Component Analysis
    report += `### 🧩 Component Analysis\n`;
    report += `**Total Components:** ${analysis.components.totalComponents}\n`;
    report += `**Functional Components:** ${analysis.components.functionalComponents}\n`;
    report += `**Class Components:** ${analysis.components.classComponents}\n`;
    if (analysis.components.issues.length > 0) {
      report += `**Issues Found:** ${analysis.components.issues.length}\n`;
      analysis.components.issues.forEach(issue => {
        report += `- ${issue.type}: ${issue.description}\n`;
      });
    }
    report += '\n';

    // Accessibility Analysis
    report += `### ♿ Accessibility Analysis\n`;
    report += `**Accessibility Score:** ${analysis.accessibility.score}%\n`;
    if (analysis.accessibility.ariaIssues.length > 0) {
      report += `**ARIA Issues:** ${analysis.accessibility.ariaIssues.length}\n`;
    }
    if (analysis.accessibility.semanticIssues.length > 0) {
      report += `**Semantic Issues:** ${analysis.accessibility.semanticIssues.length}\n`;
    }
    report += '\n';

    // Bundle Analysis
    report += `### 📦 Bundle Analysis\n`;
    report += `**Script Chunks:** ${analysis.bundles.chunks}\n`;
    report += `**Caching Enabled:** ${analysis.bundles.caching ? '✅ Yes' : '❌ No'}\n\n`;

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += `### 💡 Recommendations\n`;
      analysis.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        report += `${priority} **${rec.title}** (${rec.category})\n`;
        report += `${rec.description}\n\n`;
      });
    }

    return report;
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.ReactQAAnalyzer = ReactQAAnalyzer;
}