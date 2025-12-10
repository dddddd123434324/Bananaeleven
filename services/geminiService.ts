import { GoogleGenAI } from "@google/genai";

// Helper to convert File/Blob to Base64
const fileToGenericBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const translateImageWithGemini = async (
  files: File[], // Changed to accept array of files
  customPrompt: string,
  temperature: number,
  apiKey: string // Added apiKey parameter
): Promise<string> => {
  // CRITICAL: Use the provided apiKey
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Prepare content parts
  const parts: any[] = [];

  // Add all images to the request
  for (const file of files) {
    const base64Data = await fileToGenericBase64(file);
    parts.push({
        inlineData: {
            mimeType: file.type,
            data: base64Data,
        },
    });
  }

  // Add text prompt
  parts.push({ text: customPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Required for high-quality editing/generation
      contents: {
        parts: parts,
      },
      config: {
        temperature: temperature,
        // High quality generation config
        imageConfig: {
            imageSize: "1K"
        }
      },
    });

    // Parse response to find the image part
    const responseParts = response.candidates?.[0]?.content?.parts;
    
    if (!responseParts) {
      throw new Error("No content returned from Gemini.");
    }

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response.");
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
        // This specific error usually implies an invalid key state
        throw new Error("API Key invalid or project not found.");
    }
    throw error;
  }
};