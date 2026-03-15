import { GoogleGenAI } from '@google/genai';
import { requestQueue } from './request-queue';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Initialize Gen AI SDK with API key (Generative Language API — a GCP service)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * Simple test function - just calls Gemini with text (no video)
 */
export async function testGeminiSimple(prompt: string): Promise<any> {
  console.log(`Testing Gemini with prompt: ${prompt}`);

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = result.text ?? '';

    console.log('Gemini response:', text);

    return {
      message: 'Gemini test successful',
      prompt,
      response: text,
      model: MODEL,
    };
  } catch (error: any) {
    console.error('Gemini test error:', error);
    throw new Error(`Gemini test failed: ${error.message}`);
  }
}

/**
 * Analyze a video using Gemini
 * Accepts the file buffer directly — no GCS needed
 * Requests are queued to avoid overwhelming the API
 */
export async function analyzeVideo(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string
): Promise<any> {
  console.log(
    `Analyzing video: ${fileName} (${fileBuffer.length} bytes) with prompt: ${prompt}`
  );

  // Enqueue the actual analysis to prevent concurrent overwhelm
  return requestQueue.enqueue(() =>
    performVideoAnalysis(fileBuffer, mimeType, fileName, prompt)
  );
}

/**
 * Upload a buffer to the Gemini File API and poll until ready.
 */
async function uploadToFileAPI(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ name: string; uri: string; mimeType: string }> {
  console.log(`Uploading to Gemini File API (${fileBuffer.length} bytes)...`);
  const uploaded = await ai.files.upload({
    file: new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    config: { mimeType, displayName: fileName },
  });

  // Poll until file processing is complete
  let fileInfo = uploaded;
  while (fileInfo.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    fileInfo = await ai.files.get({ name: fileInfo.name! });
    console.log(`File state: ${fileInfo.state}`);
  }

  if (fileInfo.state !== 'ACTIVE') {
    throw new Error(`File processing failed with state: ${fileInfo.state}`);
  }

  return {
    name: fileInfo.name!,
    uri: fileInfo.uri!,
    mimeType: fileInfo.mimeType || mimeType,
  };
}

/**
 * Internal function that performs the actual video analysis
 */
async function performVideoAnalysis(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string
): Promise<any> {
  console.log(`Starting video analysis at ${new Date().toISOString()}`);

  let uploadedFileName: string | undefined;

  try {
    // Upload video to Gemini File API
    const uploadedFile = await uploadToFileAPI(fileBuffer, mimeType, fileName);
    uploadedFileName = uploadedFile.name;

    // Enhanced prompt to ensure timestamp format
    const enhancedPrompt = `${prompt}\n\nIMPORTANT: Provide all timestamps in MM:SS or HH:MM:SS format (e.g., 01:23 or 1:23:45). List each moment on a new line with its timestamp.`;

    // Reference the file uploaded to the File API
    const filePart = {
      fileData: {
        mimeType: uploadedFile.mimeType,
        fileUri: uploadedFile.uri,
      },
    };

    const textPart = {
      text: enhancedPrompt,
    };

    console.log('Sending request to Gemini...');
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [filePart, textPart],
        },
      ],
    });
    console.log(`Received response at ${new Date().toISOString()}`);

    const analysisText = result.text ?? '';

    console.log('Gemini response:', analysisText);

    // Extract timestamp ranges from the analysis text
    // Look for patterns like "MM:SS - MM:SS" or "MM:SS-MM:SS" (ranges)
    const rangeRegex =
      /(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/g;
    const ranges: string[] = [];
    let match;

    while ((match = rangeRegex.exec(analysisText)) !== null) {
      ranges.push(`${match[1]} - ${match[2]}`);
    }

    // Deduplicate overlapping ranges
    function toSeconds(ts: string): number {
      const parts = ts.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return parts[0] || 0;
    }

    function parseRange(range: string): { start: number; end: number } | null {
      const match = range.match(
        /(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/
      );
      if (match) {
        return { start: toSeconds(match[1]), end: toSeconds(match[2]) };
      }
      return null;
    }

    function rangesOverlap(
      r1: { start: number; end: number },
      r2: { start: number; end: number }
    ): boolean {
      return r1.start <= r2.end && r1.end >= r2.start;
    }

    // Remove duplicates and overlapping ranges, keeping the first occurrence
    const uniqueRanges: string[] = [];
    const parsedRanges: { start: number; end: number }[] = [];

    for (const range of ranges) {
      const parsed = parseRange(range);
      if (!parsed) continue;

      // Check if this range overlaps with any existing range
      const overlaps = parsedRanges.some((existing) =>
        rangesOverlap(existing, parsed)
      );

      if (!overlaps) {
        uniqueRanges.push(range);
        parsedRanges.push(parsed);
      }
    }

    const timestamps =
      uniqueRanges.length > 0
        ? uniqueRanges
        : [
            ...new Set(
              analysisText.match(
                /\b(?:(\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}):(\d{2}))\b/g
              ) || []
            ),
          ].sort();

    // Clean up: Delete the file from File API after successful analysis
    if (uploadedFileName) {
      try {
        await ai.files.delete({ name: uploadedFileName });
        console.log(`🗑️  Deleted file from File API: ${uploadedFileName}`);
      } catch (e) {
        console.error('Error deleting from File API:', e);
      }
    }

    return {
      message: 'Analysis complete',
      fileName,
      prompt,
      status: 'completed',
      analysisText,
      timestamps,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('Error analyzing video:', error);
    if (uploadedFileName) {
      try {
        await ai.files.delete({ name: uploadedFileName });
      } catch (_) {}
    }
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}
