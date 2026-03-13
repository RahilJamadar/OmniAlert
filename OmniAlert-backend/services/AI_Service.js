const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = "https://openrouter.ai/api/v1/chat/completions";
    this.model = "liquid/lfm-2.5-1.2b-instruct:free";
  }

  /**
   * FINAL ROBUST JSON CLEANER
   * Specifically strips backticks and "json" markers, then extracts 
   * only the content between the first and last curly braces.
   */
  _cleanJSONResponse(content) {
    if (!content) return "{}";
    
    try {
      // Find the first occurrence of '{' and the last occurrence of '}'
      const firstBracket = content.indexOf('{');
      const lastBracket = content.lastIndexOf('}');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return content.substring(firstBracket, lastBracket + 1);
      }
      
      return content.trim();
    } catch (e) {
      console.error("Error cleaning JSON:", e);
      return "{}";
    }
  }

  /**
   * Private helper to handle AI requests with Exponential Backoff
   */
  async _requestAI(payload, retries = 3, delay = 2000) {
    try {
      const response = await axios.post(this.baseURL, payload, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
          "X-Title": "OmniAlert",
          "Content-Type": "application/json"
        }
      });

      let responseContent = response.data.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Empty response from AI");
      
      // Extract ONLY the JSON part from the response string
      const sanitizedContent = this._cleanJSONResponse(responseContent);
      
      try {
        return JSON.parse(sanitizedContent);
      } catch (parseError) {
        console.error("Critical: Failed to parse sanitized content:", sanitizedContent);
        throw new Error("AI output format is invalid for JSON parsing.");
      }
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        console.warn(`Rate limited (429). Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._requestAI(payload, retries - 1, delay * 2);
      }

      console.error("AI Request Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async analyzeRisk(sensorDataArray) {
    if (!this.apiKey) {
      return { 
        risk_level: "RED", 
        threat_type: "LANDSLIDE", 
        suggested_action: "Evacuate North", 
        confidence: 0.95 
      };
    }

    const payload = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an early warning AI. Analyze sensor data. Output ONLY a raw JSON object. Do not use markdown backticks. Structure: { \"risk_level\": \"RED|ORANGE|YELLOW\", \"threat_type\": \"string\", \"suggested_action\": \"string\", \"confidence\": number }"
        },
        {
          role: "user",
          content: `Data: ${JSON.stringify(sensorDataArray)}`
        }
      ]
    };

    try {
      return await this._requestAI(payload);
    } catch (error) {
      console.error("AI Analysis Failed. Returning safe fallback data.", error.message);
      return { 
        risk_level: "YELLOW", 
        threat_type: "SYSTEM_FALLBACK", 
        suggested_action: "Monitor local authorities. AI analysis degraded.", 
        confidence: 50 
      };
    }
  }

  async fetchWeatherPredictiveRisk(lat, lng) {
    if (!this.openWeatherApiKey) return this._mockPredictiveWeather(lat, lng);

    try {
      const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=metric`);
      const weatherData = weatherRes.data;

      if (!this.apiKey) return this._mockPredictiveWeather(lat, lng);

      const predictPayload = {
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Meteorological Engine: Analyze weather for CYCLONE, MONSOON, or DROUGHT. Output ONLY a raw JSON object without markdown formatting. Schema: { \"severity_score\": number, \"threat_category\": \"CYCLONE|MONSOON|DROUGHT|NORMAL\", \"alert_level\": \"RED|ORANGE|YELLOW|GREEN\", \"predictive_analysis\": \"string\" }"
          },
          {
            role: "user",
            content: `Weather at (${lat}, ${lng}): ${JSON.stringify(weatherData)}`
          }
        ]
      };

      return await this._requestAI(predictPayload);
    } catch (error) {
      return this._mockPredictiveWeather(lat, lng);
    }
  }

  _mockPredictiveWeather(lat, lng) {
    return {
      severity_score: 88,
      threat_category: "CYCLONE",
      alert_level: "RED",
      predictive_analysis: "MOCK DATA: High likelihood of severe weather."
    };
  }
}

module.exports = new AIService();