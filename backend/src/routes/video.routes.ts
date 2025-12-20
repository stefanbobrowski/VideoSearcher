import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { uploadVideo, analyzeVideo, testGeminiSimple } from '../services/video.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { checkUserQuota } from '../middleware/quota.middleware';
import { uploadLimiter, analyzeLimiter } from '../middleware/rateLimit.middleware';
import { validateVideoFile, validateAnalyzeRequest, validateClipSettings } from '../middleware/validation.middleware';
import { getQuotaStatus } from '../services/user.service';

const storage = new Storage();

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB max file size
  }
});

// Simple test endpoint - just calls Gemini with text
router.post('/test-gemini', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const testPrompt = prompt || 'Say hello and tell me a joke';
    
    console.log('Testing Gemini with simple text prompt...');
    const result = await testGeminiSimple(testPrompt);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Gemini test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate signed URL for direct upload to GCS
router.post(
  '/generate-upload-url',
  authenticateToken,
  checkUserQuota,
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileName, contentType } = req.body;
      
      if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType are required' });
      }
      
      const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'video-searcher-uploads');
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const gcsFileName = `uploads/${Date.now()}-${sanitizedFileName}`;
      const file = bucket.file(gcsFileName);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: contentType,
      });
      
      console.log('✅ Generated signed URL for:', gcsFileName);
      res.json({ 
        uploadUrl: url, 
        fileName: gcsFileName,
        gcsUri: `gs://${bucket.name}/${gcsFileName}`
      });
    } catch (error: any) {
      console.error('❌ Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);


// Single upload endpoint: uploads video to GCS
// Now requires authentication and checks quota
router.post(
  '/upload', 
  authenticateToken,
  checkUserQuota,
  uploadLimiter,
  upload.single('video'),
  validateVideoFile,
  async (req: AuthRequest, res: Response) => {
    console.log('📤 /upload endpoint hit');
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const result = await uploadVideo(req.file);
      console.log('✅ Upload successful:', result.gcsUri);
      
      // Get updated quota
      const quota = getQuotaStatus(req.userId!);
      
      res.status(200).json({
        ...result,
        quota,
      });
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Analysis endpoint: analyzes video with Gemini
// Now requires authentication, checks quota, and validates input
router.post(
  '/analyze',
  authenticateToken,
  checkUserQuota,
  analyzeLimiter,
  validateAnalyzeRequest,
  validateClipSettings,
  async (req: AuthRequest, res: Response) => {
    console.log('🔍 /analyze endpoint hit');
    console.log('Request body:', req.body);
    
    try {
      const { gcsUri, prompt } = req.body;

      console.log('🔄 Starting analysis for:', gcsUri);
      const result = await analyzeVideo(gcsUri, prompt);
      
      // Record this request (increment quota counter)
      if (req.userId) {
        const { incrementRequestCount } = require('../services/user.service');
        incrementRequestCount(req.userId);
      }
      
      // Get updated quota
      const quota = getQuotaStatus(req.userId!);
      
      console.log('✅ Analysis complete');
      res.status(200).json({
        ...result,
        quota,
      });
    } catch (error: any) {
      console.error('❌ Analysis failed:', error);
      
      // Special handling for service agent provisioning
      if (error.message?.includes('Service agents are being provisioned')) {
        return res.status(503).json({ 
          error: 'Vertex AI is being set up for the first time. Please wait 2-3 minutes and try again.',
          retryAfter: 180,
          isProvisioning: true
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;