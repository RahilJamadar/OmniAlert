const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = "https://openrouter.ai/api/v1/chat/completions";
    // Using mistral-small-3.1-24b-instruct:free
    this.model = "openai/gpt-oss-20b:free";
  }

  /**
   * Private helper to handle AI requests with Exponential Backoff
   * Helps mitigate 429 "Too Many Requests" errors
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

      const responseContent = response.data.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Empty response from AI");
      
      return JSON.parse(responseContent);
    } catch (error) {
      // If we hit a rate limit (429) and have retries left
      if (error.response?.status === 429 && retries > 0) {
        console.warn(`Rate limited (429). Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._requestAI(payload, retries - 1, delay * 2); // Double the delay for next attempt
      }

      console.error("AI Request Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async analyzeRisk(sensorDataArray) {
    if (!this.apiKey) {
      console.warn("WARN: OPENROUTER_API_KEY is missing. Returning mock data.");
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
          content: `You are an advanced early warning risk assessment AI. Analyze the provided live sensor data (rainfall, soil moisture, river levels) and output a JSON risk assessment. The output MUST exactly match this JSON structure: { "risk_level": "RED|ORANGE|YELLOW", "threat_type": "string", "suggested_action": "string", "confidence": number }`
        },
        {
          role: "user",
          content: `Live Sensor Data: ${JSON.stringify(sensorDataArray)}`
        }
      ]
    };

    try {
      return await this._requestAI(payload);
    } catch (error) {
      throw new Error("Failed to assess risk via OpenRouter after retries.");
    }
  }

  async fetchWeatherPredictiveRisk(lat, lng) {
    if (!this.openWeatherApiKey) {
      console.warn("WARN: OPENWEATHER_API_KEY is missing. Generating mock.");
      return this._mockPredictiveWeather(lat, lng);
    }

    try {
      // 1. Fetch live weather from OpenWeather
      const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=metric`);
      const weatherData = weatherRes.data;

      if (!this.apiKey) return this._mockPredictiveWeather(lat, lng);

      // 2. Prepare AI Payload
      const predictPayload = {
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an AI meteriological analyst focusing on Cyclones, Heavy Monsoons, and Drought scenarios. Analyze the weather conditions and return JSON: { "severity_score": number (1-100), "threat_category": "CYCLONE|MONSOON|DROUGHT|NORMAL", "alert_level": "RED|ORANGE|YELLOW|GREEN", "predictive_analysis": "string" }`
          },
          {
            role: "user",
            content: `Live Weather Data (Lat: ${lat}, Lng: ${lng}): ${JSON.stringify(weatherData)}`
          }
        ]
      };

      // 3. Request analysis with retry logic
      return await this._requestAI(predictPayload);
    } catch (error) {
      console.error("Predictive Risk fetch error:", error.message);
      // Fallback to mock so the app doesn't crash during demo/dev
      return this._mockPredictiveWeather(lat, lng);
    }
  }

  _mockPredictiveWeather(lat, lng) {
    return {
      severity_score: 88,
      threat_category: "CYCLONE",
      alert_level: "RED",
      predictive_analysis: "MOCK DATA: High likelihood of severe weather based on simulated pressure drops."
    };
  }
}

module.exports = new AIService();