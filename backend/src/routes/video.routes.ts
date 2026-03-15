import { Router, Request, Response } from 'express';
import multer from 'multer';
import { analyzeVideo, testGeminiSimple } from '../services/video.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { checkUserQuota } from '../middleware/quota.middleware';
import { analyzeLimiter } from '../middleware/rateLimit.middleware';
import { validateVideoFile } from '../middleware/validation.middleware';
import { getQuotaStatus } from '../services/user.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size
  },
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

// Combined upload + analyze endpoint
// Accepts video file + prompt, uploads to Gemini File API, analyzes, returns results
router.post(
  '/analyze',
  authenticateToken,
  checkUserQuota,
  analyzeLimiter,
  upload.single('video'),
  validateVideoFile,
  async (req: AuthRequest, res: Response) => {
    console.log('🔍 /analyze endpoint hit');

    const prompt = req.body.prompt;
    if (
      !prompt ||
      typeof prompt !== 'string' ||
      prompt.trim().length < 10 ||
      prompt.trim().length > 1000
    ) {
      return res
        .status(400)
        .json({ error: 'Prompt must be between 10 and 1000 characters' });
    }

    try {
      console.log('🔄 Starting analysis for:', req.file!.originalname);
      const result = await analyzeVideo(
        req.file!.buffer,
        req.file!.mimetype,
        req.file!.originalname,
        prompt.trim()
      );

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
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
