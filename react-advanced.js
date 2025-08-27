
class ReactAdvancedAnalyzer {
  constructor() {
    this.hookPatterns = new Map();
    this.stateFlows = [];
    this.memoryLeaks = [];
    this.errorBoundaries = [];
    this.testingPatterns = [];
  }

  // Main advanced analysis entry point
  async analyzeAdvancedReact() {
    const analysis = {
      advancedPerformance: await this.analyzeAdvancedPerformance(),
      stateManagement: await this.analyzeStateManagement(),
      errorHandling: await this.analyzeErrorBoundaries(),
      testing: await this.analyzeTestingSetup(),
      codeQuality: await this.analyzeCodeQuality(),
      securityChecks: await this.analyzeSecurityPatterns()
    };

    return analysis;
  }

  // Advanced performance analysis
  async analyzeAdvancedPerformance() {
    const analysis = {
      hookDependencies: this.analyzeHookDependencies(),
      memoryLeaks: this.detectMemoryLeaks(),
      renderOptimization: this.analyzeRenderOptimization(),
      asyncPatterns: this.analyzeAsyncPatterns(),
      virtualScrolling: this.detectVirtualScrolling(),
      codesplitting: this.analyzeCodeSplitting(),
      issues: [],
      recommendations: []
    };

    // Generate performance recommendations
    analysis.recommendations = this.generatePerformanceRecommendations(analysis);
    return analysis;
  }

  // Analyze React hooks dependencies and patterns
  analyzeHookDependencies() {
    const hookAnalysis = {
      useEffectIssues: [],
      useCallbackIssues: [],
      useMemoIssues: [],
      customHooks: [],
      totalHooks: 0,
      potentialIssues: 0
    };

    try {
      // Look for common hook anti-patterns in the DOM
      // This is a simplified analysis - in a real implementation, we'd need AST parsing

      // Check for potential infinite loop patterns
      const elements = document.querySelectorAll('*');
      let hookElements = 0;

      elements.forEach(element => {
        // Check for React Fiber properties that might indicate hook usage
        const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber'));
        if (fiberKey) {
          const fiber = element[fiberKey];
          if (fiber && fiber.memoizedState) {
            hookElements++;
            hookAnalysis.totalHooks++;

            // Analyze hook chain for potential issues
            let current = fiber.memoizedState;
            let hookCount = 0;
            
            while (current && hookCount < 50) { // Prevent infinite loops
              if (current.deps) {
                // Check for empty dependency arrays (potential issues)
                if (current.deps.length === 0) {
                  hookAnalysis.useEffectIssues.push({
                    type: 'Empty Dependencies',
                    description: 'useEffect with empty dependency array - verify if intentional'
                  });
                }
                
                // Check for missing dependencies (simplified heuristic)
                if (current.deps.some(dep => dep === null || dep === undefined)) {
                  hookAnalysis.useEffectIssues.push({
                    type: 'Null Dependencies',
                    description: 'useEffect with null/undefined dependencies'
                  });
                  hookAnalysis.potentialIssues++;
                }
              }

              current = current.next;
              hookCount++;
            }

            if (hookCount >= 50) {
              hookAnalysis.useEffectIssues.push({
                type: 'Too Many Hooks',
                description: 'Component has excessive number of hooks - consider splitting'
              });
              hookAnalysis.potentialIssues++;
            }
          }
        }
      });

    } catch (error) {
      // Silent error handling
    }

    return hookAnalysis;
  }

  // Detect potential memory leaks
  detectMemoryLeaks() {
    const leakAnalysis = {
      eventListeners: [],
      intervals: [],
      subscriptions: [],
      domReferences: [],
      totalLeaks: 0,
      riskLevel: 'low'
    };

    try {
      // Check for potential event listener leaks
      const elementsWithListeners = document.querySelectorAll('*');
      let listenerCount = 0;

      elementsWithListeners.forEach(element => {
        const events = ['click', 'scroll', 'resize', 'mousemove', 'keydown'];
        events.forEach(eventType => {
          if (element[`on${eventType}`] || element.getAttribute(`on${eventType}`)) {
            listenerCount++;
          }
        });
      });

      if (listenerCount > 100) {
        leakAnalysis.eventListeners.push({
          type: 'High Event Listener Count',
          count: listenerCount,
          description: 'Large number of event listeners detected - ensure proper cleanup'
        });
        leakAnalysis.totalLeaks++;
      }

      // Check for potential interval/timeout leaks
      // This would need more sophisticated detection in a real implementation
      if (window.setInterval.toString().includes('native') === false) {
        leakAnalysis.intervals.push({
          type: 'Interval Override Detected',
          description: 'setInterval may be overridden - check for proper cleanup'
        });
      }

      // Estimate risk level
      if (leakAnalysis.totalLeaks > 3) {
        leakAnalysis.riskLevel = 'high';
      } else if (leakAnalysis.totalLeaks > 1) {
        leakAnalysis.riskLevel = 'medium';
      }

    } catch (error) {
      // Silent error handling
    }

    return leakAnalysis;
  }

  // Analyze render optimization patterns
  analyzeRenderOptimization() {
    const optimization = {
      memoization: {
        reactMemo: 0,
        useMemo: 0,
        useCallback: 0,
        score: 0
      },
      virtualization: {
        detected: false,
        libraries: [],
        largeListsWithoutVirtualization: 0
      },
      codesplitting: {
        detected: false,
        lazyComponents: 0,
        suspenseBoundaries: 0
      },
      recommendations: []
    };

    try {
      // Check for large lists that might need virtualization
      const lists = document.querySelectorAll('ul, ol, [role="list"]');
      lists.forEach(list => {
        const items = list.children.length;
        if (items > 100) {
          optimization.virtualization.largeListsWithoutVirtualization++;
          optimization.recommendations.push({
            type: 'Virtualization',
            description: `List with ${items} items could benefit from virtualization`
          });
        }
      });

      // Check for code splitting indicators
      const scripts = document.querySelectorAll('script[src]');
      const hasChunks = Array.from(scripts).some(script => 
        script.src.includes('chunk') || script.src.includes('lazy') || script.src.includes('async')
      );
      
      if (hasChunks) {
        optimization.codesplitting.detected = true;
      }

      // Look for React.lazy indicators
      if (window.React && window.React.lazy) {
        optimization.codesplitting.lazyComponents = 1; // Basic detection
      }

      // Calculate optimization score
      const totalOptimizations = optimization.memoization.reactMemo + 
                               optimization.memoization.useMemo + 
                               optimization.memoization.useCallback +
                               (optimization.codesplitting.detected ? 1 : 0) +
                               (optimization.virtualization.detected ? 1 : 0);
                               
      optimization.memoization.score = Math.min(100, totalOptimizations * 20);

    } catch (error) {
      // Silent error handling
    }

    return optimization;
  }

  // Analyze async patterns and data fetching
  analyzeAsyncPatterns() {
    const asyncAnalysis = {
      dataFetching: {
        fetchCalls: 0,
        axiosDetected: false,
        reactQueryDetected: false,
        swrDetected: false,
        apolloDetected: false
      },
      errorHandling: {
        trycatch: 0,
        errorBoundaries: 0,
        asyncErrorHandling: false
      },
      loadingStates: {
        loadingIndicators: 0,
        skeletonScreens: 0,
        suspense: 0
      },
      recommendations: []
    };

    try {
      // Check for data fetching libraries
      if (window.axios) {
        asyncAnalysis.dataFetching.axiosDetected = true;
      }
      
      if (window.ReactQuery || document.querySelector('[data-rq]')) {
        asyncAnalysis.dataFetching.reactQueryDetected = true;
      }
      
      if (window.SWR || document.querySelector('[data-swr-key]')) {
        asyncAnalysis.dataFetching.swrDetected = true;
      }

      if (window.Apollo || window.__APOLLO_CLIENT__) {
        asyncAnalysis.dataFetching.apolloDetected = true;
      }

      // Check for loading indicators
      const loadingElements = document.querySelectorAll(
        '[class*="loading"], [class*="spinner"], [class*="skeleton"], .loading, .spinner, .skeleton'
      );
      asyncAnalysis.loadingStates.loadingIndicators = loadingElements.length;

      // Check for React Suspense
      if (window.React && window.React.Suspense) {
        asyncAnalysis.loadingStates.suspense = 1;
      }

      // Generate recommendations
      if (!asyncAnalysis.dataFetching.reactQueryDetected && 
          !asyncAnalysis.dataFetching.swrDetected && 
          !asyncAnalysis.dataFetching.apolloDetected) {
        asyncAnalysis.recommendations.push({
          type: 'Data Fetching',
          description: 'Consider using React Query, SWR, or Apollo for better data fetching patterns'
        });
      }

      if (asyncAnalysis.loadingStates.loadingIndicators === 0) {
        asyncAnalysis.recommendations.push({
          type: 'Loading States',
          description: 'Add loading indicators for better user experience'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return asyncAnalysis;
  }

  // Detect virtual scrolling implementations
  detectVirtualScrolling() {
    const virtualization = {
      libraries: [],
      detected: false,
      performance: 'unknown'
    };

    try {
      // Check for popular virtualization libraries
      const virtualizationLibraries = [
        { name: 'React Window', check: () => window.ReactWindow || document.querySelector('[data-react-window]') },
        { name: 'React Virtualized', check: () => window.ReactVirtualized || document.querySelector('.ReactVirtualized__Grid') },
        { name: 'Tanstack Virtual', check: () => window.TanstackVirtual || document.querySelector('[data-virtual]') }
      ];

      virtualizationLibraries.forEach(lib => {
        if (lib.check()) {
          virtualization.libraries.push(lib.name);
          virtualization.detected = true;
        }
      });

      // Check for custom virtualization patterns
      const virtualElements = document.querySelectorAll('[style*="transform"], [data-virtual-item]');
      if (virtualElements.length > 10 && !virtualization.detected) {
        virtualization.detected = true;
        virtualization.libraries.push('Custom Implementation');
      }

    } catch (error) {
      // Silent error handling
    }

    return virtualization;
  }

  // Analyze code splitting implementation
  analyzeCodeSplitting() {
    const splitting = {
      routeBasedSplitting: false,
      componentBasedSplitting: false,
      bundleAnalysis: {
        totalBundles: 0,
        mainBundleSize: 'unknown',
        asyncChunks: 0
      },
      recommendations: []
    };

    try {
      // Check for route-based splitting (React Router)
      if (window.ReactRouter || document.querySelector('[data-reach-router]')) {
        const scripts = document.querySelectorAll('script[src]');
        const routeChunks = Array.from(scripts).filter(script => 
          script.src.includes('route') || script.src.includes('page')
        );
        
        if (routeChunks.length > 0) {
          splitting.routeBasedSplitting = true;
        }
      }

      // Check for component-based splitting
      const allScripts = document.querySelectorAll('script[src]');
      splitting.bundleAnalysis.totalBundles = allScripts.length;
      
      const asyncChunks = Array.from(allScripts).filter(script => 
        script.src.includes('chunk') || script.src.includes('async') || script.async
      );
      splitting.bundleAnalysis.asyncChunks = asyncChunks.length;

      // Generate recommendations
      if (!splitting.routeBasedSplitting && splitting.bundleAnalysis.totalBundles < 3) {
        splitting.recommendations.push({
          type: 'Route Splitting',
          description: 'Implement route-based code splitting for better performance'
        });
      }

      if (splitting.bundleAnalysis.asyncChunks === 0) {
        splitting.recommendations.push({
          type: 'Bundle Splitting',
          description: 'No async chunks detected - consider implementing code splitting'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return splitting;
  }

  // Analyze state management patterns
  async analyzeStateManagement() {
    const stateAnalysis = {
      redux: this.analyzeRedux(),
      context: this.analyzeContext(),
      zustand: this.analyzeZustand(),
      recoil: this.analyzeRecoil(),
      propDrilling: this.detectPropDrilling(),
      localState: this.analyzeLocalState(),
      recommendations: []
    };

    stateAnalysis.recommendations = this.generateStateRecommendations(stateAnalysis);
    return stateAnalysis;
  }

  // Analyze Redux implementation
  analyzeRedux() {
    const redux = {
      detected: false,
      devToolsAvailable: false,
      storeStructure: {},
      middlewareDetected: [],
      issues: []
    };

    try {
      // Check for Redux
      if (window.__REDUX_DEVTOOLS_EXTENSION__ || window.Redux) {
        redux.detected = true;
        redux.devToolsAvailable = !!window.__REDUX_DEVTOOLS_EXTENSION__;
      }

      // Check for Redux store in React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && redux.detected) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.renderers) {
          hook.renderers.forEach(renderer => {
            if (renderer.findFiberByHostInstance) {
              // Redux store analysis would go here
            }
          });
        }
      }

      // Check for common Redux middleware
      const middlewareChecks = [
        { name: 'Redux Thunk', check: () => window.ReduxThunk },
        { name: 'Redux Saga', check: () => window.ReduxSaga },
        { name: 'Redux Toolkit', check: () => window.RTK || window.ReduxToolkit }
      ];

      middlewareChecks.forEach(middleware => {
        if (middleware.check()) {
          redux.middlewareDetected.push(middleware.name);
        }
      });

    } catch (error) {
      // Silent error handling
    }

    return redux;
  }

  // Analyze React Context usage
  analyzeContext() {
    const context = {
      providers: 0,
      consumers: 0,
      nestedProviders: 0,
      potentialPerformanceIssues: [],
      recommendations: []
    };

    try {
      // Look for Context Provider patterns in the DOM
      const providers = document.querySelectorAll('[data-react-component*="Provider"], [class*="Provider"]');
      context.providers = providers.length;

      // Check for nested providers (potential performance issue)
      providers.forEach(provider => {
        const nestedProviders = provider.querySelectorAll('[data-react-component*="Provider"], [class*="Provider"]');
        if (nestedProviders.length > 0) {
          context.nestedProviders += nestedProviders.length;
          context.potentialPerformanceIssues.push({
            type: 'Nested Providers',
            description: 'Multiple nested Context Providers may cause unnecessary re-renders'
          });
        }
      });

      // Generate recommendations
      if (context.providers > 5) {
        context.recommendations.push({
          type: 'Context Optimization',
          description: `${context.providers} Context Providers detected - consider consolidation or state management library`
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return context;
  }

  // Analyze other state management libraries
  analyzeZustand() {
    return {
      detected: !!window.zustand || !!window.Zustand,
      stores: 0
    };
  }

  analyzeRecoil() {
    return {
      detected: !!window.Recoil || !!document.querySelector('[data-recoil]'),
      atoms: 0,
      selectors: 0
    };
  }

  // Detect prop drilling patterns
  detectPropDrilling() {
    const drilling = {
      detected: false,
      depth: 0,
      affectedComponents: 0,
      recommendations: []
    };

    try {
      // This is a simplified heuristic - real prop drilling detection would need AST analysis
      const elements = document.querySelectorAll('*');
      let maxDepth = 0;
      
      elements.forEach(element => {
        const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber'));
        if (fiberKey) {
          const fiber = element[fiberKey];
          if (fiber && fiber.pendingProps) {
            const propCount = Object.keys(fiber.pendingProps).length;
            
            // Heuristic: many props might indicate prop drilling
            if (propCount > 8) {
              drilling.affectedComponents++;
            }
          }
        }
      });

      if (drilling.affectedComponents > 3) {
        drilling.detected = true;
        drilling.recommendations.push({
          type: 'Prop Drilling',
          description: 'Multiple components with many props detected - consider Context or state management'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return drilling;
  }

  // Analyze local state usage
  analyzeLocalState() {
    const localState = {
      components: 0,
      complexState: 0,
      recommendations: []
    };

    // This would need more sophisticated analysis in a real implementation
    localState.recommendations.push({
      type: 'State Analysis',
      description: 'Use React DevTools for detailed local state inspection'
    });

    return localState;
  }

  // Analyze error boundaries
  async analyzeErrorBoundaries() {
    const errorAnalysis = {
      errorBoundaries: 0,
      coverage: 'unknown',
      asyncErrorHandling: false,
      errorReporting: {
        sentry: false,
        bugsnag: false,
        custom: false
      },
      recommendations: []
    };

    try {
      // Check for error boundary indicators
      const errorBoundaryElements = document.querySelectorAll(
        '[data-error-boundary], [class*="error-boundary"], [class*="ErrorBoundary"]'
      );
      errorAnalysis.errorBoundaries = errorBoundaryElements.length;

      // Check for error reporting services
      if (window.Sentry) {
        errorAnalysis.errorReporting.sentry = true;
      }
      
      if (window.Bugsnag) {
        errorAnalysis.errorReporting.bugsnag = true;
      }

      // Check for custom error handling
      if (window.onerror || window.addEventListener) {
        errorAnalysis.errorReporting.custom = true;
      }

      // Generate recommendations
      if (errorAnalysis.errorBoundaries === 0) {
        errorAnalysis.recommendations.push({
          priority: 'high',
          type: 'Error Boundaries',
          description: 'No error boundaries detected - implement error boundaries for better error handling'
        });
      }

      if (!errorAnalysis.errorReporting.sentry && !errorAnalysis.errorReporting.bugsnag) {
        errorAnalysis.recommendations.push({
          priority: 'medium',
          type: 'Error Reporting',
          description: 'Consider implementing error reporting service (Sentry, Bugsnag, etc.)'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return errorAnalysis;
  }

  // Analyze testing setup
  async analyzeTestingSetup() {
    const testingAnalysis = {
      frameworks: {
        jest: false,
        reactTestingLibrary: false,
        enzyme: false,
        cypress: false,
        playwright: false
      },
      testFiles: 0,
      coverage: 'unknown',
      recommendations: []
    };

    try {
      // Check for testing libraries (simplified detection)
      const testingLibraryChecks = [
        { name: 'jest', check: () => window.jest || document.querySelector('script[src*="jest"]') },
        { name: 'reactTestingLibrary', check: () => window.RTL || document.querySelector('script[src*="testing-library"]') },
        { name: 'enzyme', check: () => window.enzyme || document.querySelector('script[src*="enzyme"]') },
        { name: 'cypress', check: () => window.cy || document.querySelector('script[src*="cypress"]') },
        { name: 'playwright', check: () => window.playwright }
      ];

      testingLibraryChecks.forEach(lib => {
        if (lib.check()) {
          testingAnalysis.frameworks[lib.name] = true;
        }
      });

      // Check for test-related data attributes
      const testAttributes = document.querySelectorAll('[data-testid], [data-test], [data-cy]');
      testingAnalysis.testFiles = testAttributes.length;

      // Generate recommendations
      if (!testingAnalysis.frameworks.jest && !testingAnalysis.frameworks.reactTestingLibrary) {
        testingAnalysis.recommendations.push({
          priority: 'medium',
          type: 'Testing Framework',
          description: 'No testing framework detected - consider Jest + React Testing Library'
        });
      }

      if (testingAnalysis.testFiles === 0) {
        testingAnalysis.recommendations.push({
          priority: 'medium',
          type: 'Test Attributes',
          description: 'No test attributes found - add data-testid for better testability'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return testingAnalysis;
  }

  // Analyze code quality patterns
  async analyzeCodeQuality() {
    const quality = {
      typescript: false,
      eslint: false,
      prettier: false,
      propTypes: false,
      strictMode: false,
      recommendations: []
    };

    try {
      // Check for TypeScript
      if (document.querySelector('script[src*="typescript"]') || window.ts) {
        quality.typescript = true;
      }

      // Check for React Strict Mode
      if (window.React && window.React.StrictMode) {
        quality.strictMode = true;
      }

      // Check for PropTypes
      if (window.PropTypes) {
        quality.propTypes = true;
      }

      // Generate recommendations
      if (!quality.typescript && !quality.propTypes) {
        quality.recommendations.push({
          priority: 'medium',
          type: 'Type Safety',
          description: 'Consider TypeScript or PropTypes for better type safety'
        });
      }

      if (!quality.strictMode) {
        quality.recommendations.push({
          priority: 'low',
          type: 'Strict Mode',
          description: 'Enable React.StrictMode for additional checks'
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return quality;
  }

  // Analyze security patterns
  async analyzeSecurityPatterns() {
    const security = {
      xssProtection: true,
      csrfProtection: 'unknown',
      contentSecurityPolicy: false,
      dangerouslySetInnerHTML: 0,
      recommendations: []
    };

    try {
      // Check for CSP
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      security.contentSecurityPolicy = !!cspMeta;

      // Check for dangerouslySetInnerHTML usage (simplified)
      const elementsWithHTML = document.querySelectorAll('*');
      let dangerousHTML = 0;
      
      elementsWithHTML.forEach(element => {
        if (element.innerHTML.includes('__html')) {
          dangerousHTML++;
        }
      });
      
      security.dangerouslySetInnerHTML = dangerousHTML;

      // Generate recommendations
      if (!security.contentSecurityPolicy) {
        security.recommendations.push({
          priority: 'high',
          type: 'Security Headers',
          description: 'Implement Content Security Policy (CSP) for XSS protection'
        });
      }

      if (security.dangerouslySetInnerHTML > 0) {
        security.recommendations.push({
          priority: 'high',
          type: 'XSS Risk',
          description: `Found ${dangerousHTML} instances of dangerouslySetInnerHTML - ensure proper sanitization`
        });
      }

    } catch (error) {
      // Silent error handling
    }

    return security;
  }

  // Generate performance recommendations
  generatePerformanceRecommendations(analysis) {
    const recommendations = [];

    if (analysis.memoryLeaks.riskLevel === 'high') {
      recommendations.push({
        priority: 'critical',
        category: 'Memory',
        title: 'Memory Leak Risk',
        description: 'High risk of memory leaks detected - review event listeners and cleanup'
      });
    }

    if (analysis.hookDependencies.potentialIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Hooks',
        title: 'Hook Dependency Issues',
        description: `${analysis.hookDependencies.potentialIssues} potential hook issues found`
      });
    }

    if (analysis.renderOptimization.virtualization.largeListsWithoutVirtualization > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        title: 'Implement Virtualization',
        description: 'Large lists detected that could benefit from virtualization'
      });
    }

    return recommendations;
  }

  // Generate state management recommendations
  generateStateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.propDrilling.detected) {
      recommendations.push({
        priority: 'medium',
        category: 'Architecture',
        title: 'Reduce Prop Drilling',
        description: 'Consider Context API or state management library'
      });
    }

    if (analysis.context.providers > 5 && !analysis.redux.detected) {
      recommendations.push({
        priority: 'medium',
        category: 'State Management',
        title: 'Consider State Management Library',
        description: 'Many Context Providers detected - Redux/Zustand might be beneficial'
      });
    }

    return recommendations;
  }

  // Generate comprehensive advanced report
  generateAdvancedReport(analysis) {
    let report = '## Advanced React Analysis\n\n';

    // Performance Section
    report += '### 🚀 Advanced Performance\n';
    report += `**Hook Issues:** ${analysis.advancedPerformance.hookDependencies.potentialIssues}\n`;
    report += `**Memory Leak Risk:** ${analysis.advancedPerformance.memoryLeaks.riskLevel}\n`;
    report += `**Optimization Score:** ${analysis.advancedPerformance.renderOptimization.memoization.score}%\n`;
    report += `**Code Splitting:** ${analysis.advancedPerformance.codesplitting.detected ? 'Implemented' : 'Not Detected'}\n\n`;

    // State Management Section
    report += '### 📊 State Management\n';
    if (analysis.stateManagement.redux.detected) {
      report += `**Redux:** Detected (DevTools: ${analysis.stateManagement.redux.devToolsAvailable ? 'Available' : 'Missing'})\n`;
    }
    report += `**Context Providers:** ${analysis.stateManagement.context.providers}\n`;
    report += `**Prop Drilling:** ${analysis.stateManagement.propDrilling.detected ? 'Detected' : 'Not Detected'}\n\n`;

    // Error Handling Section
    report += '### 🛡️ Error Handling\n';
    report += `**Error Boundaries:** ${analysis.errorHandling.errorBoundaries}\n`;
    report += `**Error Reporting:** ${Object.keys(analysis.errorHandling.errorReporting).filter(key => analysis.errorHandling.errorReporting[key]).join(', ') || 'None'}\n\n`;

    // Testing Section
    report += '### 🧪 Testing\n';
    const frameworks = Object.keys(analysis.testing.frameworks).filter(key => analysis.testing.frameworks[key]);
    report += `**Frameworks:** ${frameworks.join(', ') || 'None detected'}\n`;
    report += `**Test Attributes:** ${analysis.testing.testFiles}\n\n`;

    // Advanced Recommendations
    const allRecommendations = [
      ...analysis.advancedPerformance.recommendations,
      ...analysis.stateManagement.recommendations,
      ...analysis.errorHandling.recommendations,
      ...analysis.testing.recommendations,
      ...analysis.codeQuality.recommendations
    ];

    if (allRecommendations.length > 0) {
      report += '### 💡 Advanced Recommendations\n';
      allRecommendations.slice(0, 5).forEach(rec => {
        const priority = rec.priority === 'critical' ? '🔴' : 
                        rec.priority === 'high' ? '🟠' : 
                        rec.priority === 'medium' ? '🟡' : '🟢';
        report += `${priority} **${rec.title || rec.type}** (${rec.category || 'General'})\n`;
        report += `${rec.description}\n\n`;
      });
    }

    return report;
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.ReactAdvancedAnalyzer = ReactAdvancedAnalyzer;
}