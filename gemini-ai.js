
class GeminiBugAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.primaryModel = 'models/gemini-2.5-flash-lite';
    this.fallbackModels = ['models/gemini-1.5-flash-latest', 'models/gemini-1.5-flash', 'models/gemini-1.5-pro'];
    this.baseUrlTemplate = 'https://generativelanguage.googleapis.com/v1beta/{model}:generateContent';
  }

  async analyzeBugReport(pageData) {
    const prompt = this.buildAnalysisPrompt(pageData);
    const modelsToTry = [this.primaryModel, ...this.fallbackModels];
    
    for (const model of modelsToTry) {
      try {
        const response = await this.callGeminiAPI(prompt, model);
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini API');
        }
        
        return this.parseGeminiResponse(response.text);
        
      } catch (error) {        
        if (model === modelsToTry[modelsToTry.length - 1]) {
          throw error;
        }
        
        continue;
      }
    }
  }

  buildAnalysisPrompt(pageData) {
    return `You are an expert web developer and QA engineer. Analyze this webpage for bugs and issues.

WEBPAGE DATA:
- URL: ${pageData.url}
- Title: ${pageData.title}
- Content Preview: ${pageData.content.slice(0, 500)}
- Console Errors: ${JSON.stringify(pageData.consoleErrors, null, 2)}
- DOM Issues: ${JSON.stringify(pageData.domErrors, null, 2)}
- Performance Data: ${pageData.performanceData ? JSON.stringify(pageData.performanceData, null, 2) : 'Not available'}
- ASP.NET Analysis: ${pageData.aspNetAnalysis ? JSON.stringify(pageData.aspNetAnalysis, null, 2) : 'Not ASP.NET application'}
- Timestamp: ${pageData.timestamp}

Please provide a comprehensive bug analysis as a SINGLE JSON object in this EXACT format (DO NOT return an array or multiple objects):
{
  "header": "## [Issue Type] ([Confidence]% confidence)",
  "severity": "[critical|high|medium|low]",
  "severityConfidence": "[number 0-100]",
  "category": "[specific issue category]",
  "categoryConfidence": "[number 0-100]", 
  "summary": "[2-3 sentence summary of the main issue]",
  "rootCause": "[likely root cause of the issue]",
  "userImpact": "[how this affects users]",
  "technicalDetails": "[technical explanation for developers]",
  "suggestedFix": "[specific steps to fix the issue]",
  "priority": "[immediate|high|medium|low]",
  "analysisType": "Gemini AI"
}

IMPORTANT: Return ONLY a single JSON object, not an array. Focus on the most important issue found.

Focus on:
1. JavaScript errors and their implications
2. Performance issues: Core Web Vitals (LCP, FID, CLS), long tasks, slow resources
3. Network problems: failed requests, slow API calls, render-blocking resources
4. Memory issues: leaks, high usage, inefficient patterns
5. UX/UI problems visible in content  
6. Authentication and authorization issues
7. Form validation and user flow issues
8. ASP.NET specific issues: ViewState problems, server errors, postback issues, session management

Pay special attention to performance metrics if available - analyze loading times, render-blocking resources, memory usage, and Core Web Vitals scores.

If ASP.NET Analysis data is provided, focus on:
- ViewState size and optimization issues
- Server-side error patterns in the rendered content
- Authentication and session management problems
- Postback and Web Forms validation issues
- Resource optimization for ASP.NET applications

Be specific and actionable in your recommendations. If there are no obvious issues, focus on potential improvements or minor concerns.`;
  }

  async callGeminiAPI(prompt, model = this.primaryModel) {
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        topP: 0.8,
        topK: 10
      }
    };

    const apiUrl = this.baseUrlTemplate.replace('{model}', model);
    const response = await fetch(`${apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return {
      text: data.candidates[0].content.parts[0].text,
      finishReason: data.candidates[0].finishReason
    };
  }

  parseGeminiResponse(responseText) {
    try {
      let cleanedText = responseText.trim();
      
      cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
      
      const jsonMatch = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON object found in Gemini response');
      }

      const jsonStr = jsonMatch[0];
      const analysis = JSON.parse(jsonStr);
      
      const finalAnalysis = Array.isArray(analysis) ? analysis[0] : analysis;
      
      const required = ['header', 'severity', 'category', 'summary'];
      for (const field of required) {
        if (!finalAnalysis[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return {
        header: String(finalAnalysis.header || "## AI Analysis Results"),
        severity: String(finalAnalysis.severity || "medium"),
        severityConfidence: String(finalAnalysis.severityConfidence || "85"),
        category: String(finalAnalysis.category || "general analysis"),
        categoryConfidence: String(finalAnalysis.categoryConfidence || "80"),
        summary: String(finalAnalysis.summary || "Analysis completed").replace(/```json|```/gi, ''),
        rootCause: String(finalAnalysis.rootCause || "See detailed analysis").replace(/```json|```/gi, ''),
        userImpact: String(finalAnalysis.userImpact || "Potential usability issues").replace(/```json|```/gi, ''),
        technicalDetails: String(finalAnalysis.technicalDetails || "Review analysis").replace(/```json|```/gi, ''),
        suggestedFix: String(finalAnalysis.suggestedFix || "Review recommendations").replace(/```json|```/gi, ''),
        priority: String(finalAnalysis.priority || "medium"),
        analysisType: "Gemini AI"
      };
      
    } catch (parseError) {
      return {
        header: "## AI Analysis Results (85% confidence)",
        severity: this.extractSeverity(responseText),
        severityConfidence: "85",
        category: "general analysis",
        categoryConfidence: "80", 
        summary: responseText.slice(0, 200).replace(/```json|```/gi, '') + "...",
        rootCause: "See detailed analysis",
        userImpact: "Potential usability issues",
        technicalDetails: responseText.replace(/```json|```/gi, ''),
        suggestedFix: "Review detailed analysis for specific recommendations",
        priority: "medium",
        analysisType: "Gemini AI"
      };
    }
  }

  extractSeverity(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('severe')) {
      return 'critical';
    } else if (lowerText.includes('high') || lowerText.includes('major')) {
      return 'high';
    } else if (lowerText.includes('medium') || lowerText.includes('moderate')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  async listAvailableModels() {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const models = data.models?.map(model => model.name.replace('models/', '')) || [];
      
      return models;
      
    } catch (error) {
      return [];
    }
  }

  async testApiKey() {
    try {
      const testPrompt = "Say 'API key is working' if you can read this.";
      const response = await this.callGeminiAPI(testPrompt, this.primaryModel);
      return response.text.toLowerCase().includes('api key is working');
    } catch (error) {
      return false;
    }
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.GeminiBugAnalyzer = GeminiBugAnalyzer;
}