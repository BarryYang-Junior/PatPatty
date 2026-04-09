import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generatePetImage = async (petName: string, petType: string, stageName?: string) => {
  try {
    const prompt = `A high-quality, cute anime-style virtual pet. 
    Name: ${stageName || petName}. 
    Element: ${petType}. 
    Style: Roco Kingdom (洛克王国) inspired, vibrant colors, clean lines, magical atmosphere, 
    centered composition, white background or simple elemental background. 
    Professional character design, 4k resolution. 
    ${stageName ? `This is the evolved form: ${stageName}.` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Failed to generate pet image:", error);
  }
  return null;
};
