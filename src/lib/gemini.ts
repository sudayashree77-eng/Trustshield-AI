import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// The API key is automatically injected by AI Studio
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  attachments?: {
    mimeType: string;
    data: string; // base64
    url: string; // object URL for preview
  }[];
  timestamp: number;
}

export const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert digital forensics AI specializing in deepfake detection and media manipulation analysis.
Your task is to analyze images and videos provided by the user to detect deepfakes, AI generations, face swaps, and digital alterations.

When analyzing media, look for:
1. Artifacts: Blurring, weird textures, or inconsistencies around edges (especially faces, hands, and hair).
2. Lighting & Shadows: Inconsistent light sources, mismatched reflections, or unnatural shadows.
3. Structural Anomalies: Asymmetry in facial features, unnatural eye movements (if video), or impossible geometry.
4. Noise Patterns: Mismatched noise profiles between different parts of the image.

Provide a detailed, structured analysis. Use a technical but accessible tone.
Always conclude your analysis with a "Deepfake Probability Score" (e.g., 85% likely to be manipulated) and a brief summary of your final verdict.

Format your response using Markdown. Use bolding for key findings.`;

export async function analyzeMedia(
  history: ChatMessage[],
  newMessage: string,
  attachments: { mimeType: string; data: string }[],
  customSystemInstruction?: string
): Promise<string> {
  try {
    // Convert history to the format expected by the SDK
    const contents = history.map((msg) => {
      const parts: any[] = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      if (msg.attachments) {
        msg.attachments.forEach((att) => {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data,
            },
          });
        });
      }
      return {
        role: msg.role,
        parts,
      };
    });

    // Add the new message
    const newParts: any[] = [];
    if (newMessage) {
      newParts.push({ text: newMessage });
    }
    attachments.forEach((att) => {
      newParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      });
    });

    contents.push({
      role: "user",
      parts: newParts,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for more analytical/factual responses
      },
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Error analyzing media:", error);
    throw new Error("Failed to analyze media. Please try again.");
  }
}

// Helper to extract a frame from a video file to send to Gemini
// (Since sending full videos via inlineData client-side can crash the browser)
export async function extractFrameFromVideo(file: File): Promise<{ mimeType: string; data: string; url: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 1 second in, or the middle if shorter
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const base64Data = dataUrl.split(",")[1];
      
      resolve({
        mimeType: "image/jpeg",
        data: base64Data,
        url: dataUrl // Use the frame as the preview URL
      });
    };

    video.onerror = (e) => {
      reject(new Error("Error loading video file"));
    };
  });
}

export async function fileToBase64(file: File): Promise<{ mimeType: string; data: string; url: string }> {
  if (file.type.startsWith("video/")) {
    return extractFrameFromVideo(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve({
        mimeType: file.type,
        data: result.split(",")[1],
        url: result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
