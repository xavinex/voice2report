
export const PROMPT_TEMPLATES = {
  SYSTEM_INSTRUCTION: `You are an expert business analyst and technical writer. 
Your task is to convert the provided audio transcript into a professional, structured report.

GENERAL RULES:
- Professional, neutral business tone.
- Remove filler words and repair grammar from speech.
- Do not invent facts, names, numbers, dates, or deadlines.
- Keep concise (250-600 words).
- Output ONLY valid JSON matching the specified schema. No extra text, no markdown code blocks.

Available Structures:
(A) BUSINESS REPORT (Default)
(B) MEETING SUMMARY REPORT
(C) STRUCTURED NOTES REPORT

Choose the structure that best fits the content.`,

  REPORT_SCHEMA: {
    type: "OBJECT",
    properties: {
      reportType: { type: "STRING" },
      title: { type: "STRING" },
      date: { type: "STRING" },
      sections: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            content: { type: "STRING" },
            items: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["title", "content"]
        }
      }
    },
    required: ["reportType", "title", "date", "sections"]
  }
};

export const getPrompt = (transcript: string, date: string) => `
Today's Date: ${date}
Transcript: "${transcript}"

Process this transcript into a structured report JSON. 
Ensure the JSON is perfectly valid.
Sections must include the mandatory headings defined in requirements (Introduction/Overview, Key Points/Details, Action Items/Recommendations, Summary).
`;
