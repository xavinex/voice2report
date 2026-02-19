
import { GoogleGenAI, Type } from "@google/genai";
import { PROMPT_TEMPLATES, getPrompt } from "../constants/promptConfig";
import { StructuredReport } from "../types";

export const generateReport = async (transcript: string): Promise<StructuredReport> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please check your configuration.");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';

  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: getPrompt(transcript, date),
      config: {
        systemInstruction: PROMPT_TEMPLATES.SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reportType: { type: Type.STRING },
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  items: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["reportType", "title", "date", "sections"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as StructuredReport;
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw error;
  }
};
