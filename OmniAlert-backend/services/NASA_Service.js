const axios = require('axios');
require('dotenv').config();

// NASA Earthdata Cloud endpoints
const NASA_LANDSLIDE_URL = 'https://gis.earthdata.nasa.gov/portal/home/item.html?id=783516e1c78f4563a753c2d899f2d67e'; // LHASA Today
const NASA_GPM_API = 'https://api.stac.earthdata.nasa.gov/v1'; // Example STAC endpoint for precipitation

async function getNASAEnvironmentalRisk(lat, lng) {
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${process.env.NASA_EARTHDATA_TOKEN}`,
        'Accept': 'application/json'
      }
    };

    // 1. Fetch Today's Landslide Probability (LHASA 2.1 Machine Learning Model)
    // Note: NASA GIS usually provides a REST endpoint for specific pixel queries
    const landslideRisk = await axios.get(
      `https://gis.earthdata.nasa.gov/server/rest/services/LHASA/Hazard_Today/ImageServer/identify`, 
      {
        ...config,
        params: {
          geometry: `${lng},${lat}`,
          geometryType: 'esriGeometryPoint',
          returnGeometry: false,
          f: 'json'
        }
      }
    );

    // 2. Interpret the Pixel Value (0-100 probability)
    const riskScore = landslideRisk.data?.value || 0; 
    
    return {
      lat,
      lng,
      landslideProbability: riskScore,
      alertLevel: riskScore > 70 ? 'CRITICAL' : riskScore > 40 ? 'WARNING' : 'STABLE',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (error.response?.status === 401) {
      console.error("NASA TOKEN EXPIRED. Please refresh your Earthdata Login token.");
    } else {
      console.error('NASA Data Error:', error.message);
    }
    return null;
  }
}

module.exports = {
  getNASAEnvironmentalRisk
};
