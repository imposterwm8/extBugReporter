// Gemini AI Integration for Bug Analysis
// Provides intelligent bug analysis using Google's Gemini API

class GeminiBugAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Primary model - Gemini 1.5 Flash (fast and efficient)
    this.primaryModel = 'gemini-1.5-flash';
    // Fallback models in order of preference
    this.fallbackModels = ['gemini-1.5-pro', 'gemini-pro'];
    this.baseUrlTemplate = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent';
  }

  // Main analysis function with model fallbacks
  async analyzeBugReport(pageData) {
    console.log('🧠 Starting Gemini AI analysis...');
    
    const prompt = this.buildAnalysisPrompt(pageData);
    const modelsToTry = [this.primaryModel, ...this.fallbackModels];
    
    for (const model of modelsToTry) {
      try {
        console.log(`📡 Trying model: ${model}`);
        const response = await this.callGeminiAPI(prompt, model);
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini API');
        }
        
        console.log(`✅ Gemini analysis completed with ${model}`);
        return this.parseGeminiResponse(response.text);
        
      } catch (error) {
        console.warn(`⚠️ Model ${model} failed:`, error.message);
        
        // If this was the last model, throw the error
        if (model === modelsToTry[modelsToTry.length - 1]) {
          console.error('❌ All Gemini models failed');
          throw error;
        }
        
        // Otherwise, continue to next model
        continue;
      }
    }
  }

  // Build detailed analysis prompt
  buildAnalysisPrompt(pageData) {
    return `You are an expert web developer and QA engineer. Analyze this webpage for bugs and issues.

WEBPAGE DATA:
- URL: ${pageData.url}
- Title: ${pageData.title}
- Content Preview: ${pageData.content.slice(0, 500)}
- Console Errors: ${JSON.stringify(pageData.consoleErrors, null, 2)}
- DOM Issues: ${JSON.stringify(pageData.domErrors, null, 2)}
- Timestamp: ${pageData.timestamp}

Please provide a comprehensive bug analysis in this EXACT JSON format:
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

Focus on:
1. JavaScript errors and their implications
2. UX/UI problems visible in content
3. Authentication and authorization issues
4. Performance and loading problems
5. Form validation and user flow issues

Be specific and actionable in your recommendations. If there are no obvious issues, focus on potential improvements or minor concerns.`;
  }

  // Call Gemini API
  async callGeminiAPI(prompt, model = this.primaryModel) {
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent analysis
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

  // Parse Gemini response
  parseGeminiResponse(responseText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const required = ['header', 'severity', 'category', 'summary'];
      for (const field of required) {
        if (!analysis[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return analysis;
      
    } catch (parseError) {
      console.warn('Failed to parse structured response, creating fallback:', parseError);
      
      // Fallback: create structured response from text
      return {
        header: "## AI Analysis Results (85% confidence)",
        severity: this.extractSeverity(responseText),
        severityConfidence: "85",
        category: "general analysis",
        categoryConfidence: "80", 
        summary: responseText.slice(0, 200) + "...",
        rootCause: "See detailed analysis",
        userImpact: "Potential usability issues",
        technicalDetails: responseText,
        suggestedFix: "Review detailed analysis for specific recommendations",
        priority: "medium",
        analysisType: "Gemini AI"
      };
    }
  }

  // Extract severity from text if JSON parsing fails
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

  // Test API key validity
  async testApiKey() {
    try {
      const testPrompt = "Say 'API key is working' if you can read this.";
      const response = await this.callGeminiAPI(testPrompt, this.primaryModel);
      return response.text.toLowerCase().includes('api key is working');
    } catch (error) {
      console.error('API key test failed:', error);
      
      // Provide specific guidance for common errors
      if (error.message.includes('404')) {
        console.error('💡 Model not found - this usually means the API key is invalid or the model name is outdated');
      } else if (error.message.includes('403')) {
        console.error('💡 Access forbidden - check if your API key has the right permissions');
      } else if (error.message.includes('429')) {
        console.error('💡 Rate limit exceeded - too many requests');
      }
      
      return false;
    }
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.GeminiBugAnalyzer = GeminiBugAnalyzer;
}