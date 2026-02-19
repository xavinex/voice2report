import { GoogleGenAI, Type } from "@google/genai";
import { PROMPT_TEMPLATES, getPrompt } from "../constants/promptConfig";
import { StructuredReport } from "../types";

export const generateReport = async (transcript: string): Promise<StructuredReport> => {
  // Vite exposes env vars ONLY via import.meta.env and ONLY if they start with VITE_
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your configuration (VITE_GEMINI_API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });

  // keep your model (change if you want)
  const model = "gemini-3-flash-preview";

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
                  items: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "content"],
              },
            },
          },
          required: ["reportType", "title", "date", "sections"],
        },
      },
    });

    // In @google/genai, text is usually available on response.text
    const raw = response.text ?? "{}";
    const result = JSON.parse(raw);
    return result as StructuredReport;
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw error;
  }
};
