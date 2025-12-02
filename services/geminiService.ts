import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Place } from "../types";

// Mock data for fallback or when no API key is present
const MOCK_PLACES: Place[] = [
  {
    id: 'mock-1',
    name: '台北 101',
    description: '世界知名的摩天大樓，可俯瞰台北市景。 (模擬資料)',
    coordinates: { lat: 25.033964, lng: 121.564468 },
    estimatedTime: '2 小時'
  },
  {
    id: 'mock-2',
    name: '中正紀念堂',
    description: '國家級紀念場所，擁有廣大的廣場與特色建築。 (模擬資料)',
    coordinates: { lat: 25.0354, lng: 121.5197 },
    estimatedTime: '1.5 小時'
  },
  {
    id: 'mock-3',
    name: '象山自然步道',
    description: '能欣賞台北 101 與城市夜景的熱門登山步道。 (模擬資料)',
    coordinates: { lat: 25.0273, lng: 121.5707 },
    estimatedTime: '2 小時'
  },
  {
    id: 'mock-4',
    name: '饒河街觀光夜市',
    description: '台北著名的觀光夜市，有許多傳統美食。 (模擬資料)',
    coordinates: { lat: 25.0509, lng: 121.5775 },
    estimatedTime: '2 小時'
  },
  {
    id: 'mock-5',
    name: '松山文創園區',
    description: '前身為菸廠，現為充滿文藝氣息的展演空間。 (模擬資料)',
    coordinates: { lat: 25.0436, lng: 121.5606 },
    estimatedTime: '3 小時'
  }
];

export const searchPlacesWithAI = async (query: string, nearbyContext?: string): Promise<Place[]> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("No API Key provided, returning mock data");
    return MOCK_PLACES;
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Wrap array in an object for better schema stability
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      places: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            estimatedTime: { type: Type.STRING, description: "Suggested duration of visit in Traditional Chinese" }
          },
          required: ["name", "description", "lat", "lng"]
        }
      }
    },
    required: ["places"]
  };

  let prompt = `列出 5 個與 "${query}" 相關的熱門旅遊景點。請提供真實的緯度(lat)與經度(lng)。請用繁體中文回答。`;
  
  if (nearbyContext) {
    prompt = `列出 5 個位於 "${nearbyContext}" 附近的熱門旅遊景點，或是與 "${query}" 相關的地方。請提供真實的緯度(lat)與經度(lng)。請用繁體中文回答。`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text || "{}";
    const rawData = JSON.parse(jsonText);
    const places = rawData.places || [];
    
    return places.map((item: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      name: item.name,
      description: item.description,
      coordinates: {
        lat: item.lat,
        lng: item.lng
      },
      estimatedTime: item.estimatedTime,
      stayMinutes: 60, // Default stay time
      transportToNext: 'CAR', // Default transport
      travelMinutesToNext: 15 // Default travel time
    }));

  } catch (error) {
    console.error("AI Search Error:", error);
    // Return mock data on error so the app remains usable
    return MOCK_PLACES.map((p, i) => ({
      ...p, 
      id: `fallback-${Date.now()}-${i}`,
      name: `${p.name} (離線結果)`
    }));
  }
};