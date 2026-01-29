import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { requestQueue } from './request-queue';

// In production (Cloud Run), authentication is automatic via the service account
// In development, use the credentials file if GOOGLE_APPLICATION_CREDENTIALS is set
const storage = new Storage(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    : {} // Empty object = use default credentials (works on Cloud Run)
);
const BUCKET_NAME = 'video-searcher-uploads';
const PROJECT_ID = 'video-searcher-1';
const LOCATION = 'us-central1';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

// Using Gemini 2.0 Flash - LATEST MODEL (December 2024+)
// This is the cutting-edge native GCP model with improved video understanding
// 
// Video capabilities:
// - Supports videos up to 1 hour long
// - Enhanced temporal understanding compared to 1.5
// - Better action detection and timestamp accuracy
// - Faster processing than previous versions
// - Best for: action detection, scene analysis, object tracking, gaming highlights
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
});

/**
 * Simple test function - just calls Gemini with text (no video)
 */
export async function testGeminiSimple(prompt: string): Promise<any> {
  console.log(`Testing Gemini with prompt: ${prompt}`);
  
  try {
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response:', text);
    
    return {
      message: 'Gemini test successful',
      prompt,
      response: text,
      model: 'gemini-2.0-flash-exp',
    };
  } catch (error: any) {
    console.error('Gemini test error:', error);
    throw new Error(`Gemini test failed: ${error.message}`);
  }
}

/**
 * Upload a video file to Google Cloud Storage
 */
export async function uploadVideo(file: Express.Multer.File): Promise<{ message: string; gcsUri: string }> {
  const { originalname, buffer } = file;
  const blob = storage.bucket(BUCKET_NAME).file(originalname);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype
    }
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', () => {
      const gcsUri = `gs://${BUCKET_NAME}/${originalname}`;
      console.log(`✅ File uploaded successfully: ${gcsUri}`);
      
      // No need to set ACLs - Vertex AI can access files in the same project
      // Uniform bucket-level access is enabled, which is more secure
      resolve({
        message: 'Upload complete',
        gcsUri
      });
    });

    blobStream.end(buffer);
  });
}

/**
 * Delete a video from Google Cloud Storage
 */
export async function deleteVideo(gcsUri: string): Promise<void> {
  try {
    // Extract filename from gs://bucket-name/filename
    const filename = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
    await storage.bucket(BUCKET_NAME).file(filename).delete();
    console.log(`🗑️  Deleted video: ${gcsUri}`);
  } catch (error: any) {
    console.error('Error deleting video:', error);
    // Don't throw - deletion failure shouldn't break the analysis response
  }
}

/**
 * Analyze a video using Vertex AI Gemini
 * Requests are queued to avoid overwhelming the API
 */
export async function analyzeVideo(gcsUri: string, prompt: string): Promise<any> {
  console.log(`Analyzing video: ${gcsUri} with prompt: ${prompt}`);
  
  // Enqueue the actual analysis to prevent concurrent overwhelm
  return requestQueue.enqueue(() => performVideoAnalysis(gcsUri, prompt));
}

/**
 * Internal function that performs the actual video analysis
 */
async function performVideoAnalysis(gcsUri: string, prompt: string): Promise<any> {
  console.log(`Starting video analysis at ${new Date().toISOString()}`);

  try {
    // Enhanced prompt to ensure timestamp format
    const enhancedPrompt = `${prompt}\n\nIMPORTANT: Provide all timestamps in MM:SS or HH:MM:SS format (e.g., 01:23 or 1:23:45). List each moment on a new line with its timestamp.`;

    // For Gemini 2.0, use inline data with file URI
    const filePart = {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: gcsUri,
      },
    };

    const textPart = {
      text: enhancedPrompt,
    };

    console.log('Sending request to Gemini...');
    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [filePart, textPart] }],
    });
    console.log(`Received response at ${new Date().toISOString()}`);
    
    const response = result.response;
    const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response:', analysisText);

    // Extract timestamp ranges from the analysis text
    // Look for patterns like "MM:SS - MM:SS" or "MM:SS-MM:SS" (ranges)
    const rangeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/g;
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
      const match = range.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/);
      if (match) {
        return { start: toSeconds(match[1]), end: toSeconds(match[2]) };
      }
      return null;
    }

    function rangesOverlap(r1: { start: number; end: number }, r2: { start: number; end: number }): boolean {
      return (r1.start <= r2.end && r1.end >= r2.start);
    }

    // Remove duplicates and overlapping ranges, keeping the first occurrence
    const uniqueRanges: string[] = [];
    const parsedRanges: { start: number; end: number }[] = [];

    for (const range of ranges) {
      const parsed = parseRange(range);
      if (!parsed) continue;

      // Check if this range overlaps with any existing range
      const overlaps = parsedRanges.some(existing => rangesOverlap(existing, parsed));
      
      if (!overlaps) {
        uniqueRanges.push(range);
        parsedRanges.push(parsed);
      }
    }

    const timestamps = uniqueRanges.length > 0 ? uniqueRanges : [...new Set(analysisText.match(/\b(?:(\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}):(\d{2}))\b/g) || [])].sort();

    // Clean up: Delete the video after successful analysis
    // This prevents storage bloat in production
    await deleteVideo(gcsUri);

    return {
      message: 'Analysis complete',
      gcsUri,
      prompt,
      status: 'completed',
      analysisText,
      timestamps,
      rawResponse: response,
    };
  } catch (error: any) {
    console.error('Error analyzing video with Vertex AI:', error);
    throw new Error(`Video analysis failed: ${error.message}`);
  }