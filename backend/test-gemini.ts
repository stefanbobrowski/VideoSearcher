import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = 'video-searcher-1';
const LOCATION = 'us-central1';

async function testGemini() {
  console.log('Testing Vertex AI Gemini connection...\n');

  const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
  });

  // Try different model versions
  const modelsToTry = [
    'gemini-2.0-flash-exp',      // Latest experimental (Dec 2024+)
    'gemini-1.5-flash-002',      // Stable version
    'gemini-1.5-flash-001',      // Older stable
    'gemini-1.5-flash',          // Unversioned (auto-latest)
    'gemini-1.5-pro-002',        // Pro version
    'gemini-1.0-pro',            // Legacy fallback
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`\n🔄 Trying model: ${modelName}`);
      
      const model = vertexAI.getGenerativeModel({
        model: modelName,
      });

      const prompt = 'Say "Hello from Gemini!" and tell me what model version you are.';
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

      console.log(`✅ SUCCESS with ${modelName}!`);
      console.log(`Response: ${text}\n`);
      console.log('='.repeat(60));
      break; // Stop after first success
      
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

testGemini().catch(console.error);
