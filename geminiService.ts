
import { GoogleGenAI, Type } from "@google/genai";

const handleApiError = (e: any) => {
  console.error("Gemini API Error:", e);
  if (e?.message?.includes("429") || e?.message?.includes("RESOURCE_EXHAUSTED")) {
    console.warn("Quota exceeded. Please wait a moment before trying again.");
    return "QUOTA_EXCEEDED";
  }
  return null;
};

export const parseFoodInput = async (userInput: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userInput,
      config: {
        systemInstruction: "You are a professional nutritionist. Parse the user's natural language meal description. Return accurate estimated calorie counts for each item. Be specific but concise. Use common nutritional averages.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  serving: { type: Type.STRING }
                },
                required: ["name", "calories", "serving"]
              }
            },
            totalCalories: { type: Type.NUMBER }
          },
          required: ["foods", "totalCalories"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return handleApiError(e);
  }
};

export interface MealOption {
  name: string;
  calories: number;
  macros: string;
  reason: string;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionalInsights {
  insights: string[];
  performanceScore: number;
  precisionReport: string;
  recommendations: Array<{
    name: string;
    reason: string;
    macroFocus: string;
  }>;
  menuOptions: {
    breakfast: MealOption[];
    lunch: MealOption[];
    dinner: MealOption[];
  };
}

export const getNutritionalInsights = async (logs: any[], profile: any): Promise<NutritionalInsights | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ROLE: Elite Performance Nutritionist.
    TASK: Generate a high-precision nutritional audit and a CUSTOM MENU PLAN for the next 24 hours.
    
    USER PROFILE:
    - Age: ${profile.age}
    - Sex: ${profile.gender}
    - Weight: ${profile.weight}kg
    - Height: ${profile.height}cm
    - Mission Goal: ${profile.goal}
    - Activity Level: ${profile.activityLevel}
    - Daily Target: ${profile.dailyCalorieTarget}kcal
    
    CURRENT LOG (Today): ${logs.length > 0 ? JSON.stringify(logs.map(l => ({ name: l.name, cals: l.calories }))) : "Log is empty. This is a new day or new user."}
    
    CRITICAL INSTRUCTION:
    Even if the log is empty, you MUST provide exactly 2 specific meal options for Breakfast, Lunch, and Dinner tailored to their specific goal (${profile.goal}). These meals should be varied, high-performance, and include estimated numeric protein/carb/fat counts.
    
    OUTPUT SCHEMA:
    {
      "insights": ["Scientific insight 1", "Scientific insight 2", "Scientific insight 3"],
      "performanceScore": 0-100,
      "precisionReport": "Short technical summary",
      "recommendations": [{"name": "Quick Fix", "reason": "Why", "macroFocus": "e.g. Protein"}],
      "menuOptions": {
        "breakfast": [{"name": "...", "calories": 400, "macros": "P:30g C:40g F:10g", "reason": "...", "protein": 30, "carbs": 40, "fats": 10}],
        "lunch": [...],
        "dinner": [...]
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite nutritionist. Return ONLY valid JSON. Ensure all menu options are present and technically sound.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            performanceScore: { type: Type.NUMBER },
            precisionReport: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  macroFocus: { type: Type.STRING }
                }
              }
            },
            menuOptions: {
              type: Type.OBJECT,
              properties: {
                breakfast: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER }, macros: { type: Type.STRING }, reason: { type: Type.STRING }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fats: { type: Type.NUMBER } }, required: ["name", "calories", "macros", "reason"] } },
                lunch: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER }, macros: { type: Type.STRING }, reason: { type: Type.STRING }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fats: { type: Type.NUMBER } }, required: ["name", "calories", "macros", "reason"] } },
                dinner: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER }, macros: { type: Type.STRING }, reason: { type: Type.STRING }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fats: { type: Type.NUMBER } }, required: ["name", "calories", "macros", "reason"] } }
              },
              required: ["breakfast", "lunch", "dinner"]
            }
          },
          required: ["insights", "performanceScore", "precisionReport", "recommendations", "menuOptions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as NutritionalInsights;
  } catch (e) {
    handleApiError(e);
    return null;
  }
};
