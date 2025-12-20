import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// File size limit: 200MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// Max video duration: 10 minutes (600 seconds)
const MAX_VIDEO_DURATION = 600;

// Max clip padding: 30 seconds
const MAX_CLIP_PADDING = 30;

// Max results: 50 clips
const MAX_RESULTS = 50;

/**
 * Validates file size and type for video upload
 */
export const validateVideoFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  // Check file size
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ 
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    });
  }

  // Check file type
  const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type. Only MP4, MOV, AVI, and WebM videos are allowed' 
    });
  }

  next();
};

/**
 * Validates analyze request parameters
 */
export const validateAnalyzeRequest = [
  body('gcsUri')
    .trim()
    .notEmpty().withMessage('GCS URI is required')
    .matches(/^gs:\/\/[a-z0-9-]+\/[^\s]+$/).withMessage('Invalid GCS URI format'),
  
  body('prompt')
    .trim()
    .notEmpty().withMessage('Prompt is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Prompt must be between 10 and 1000 characters')
    .matches(/^[a-zA-Z0-9\s.,!?'"()-:]+$/).withMessage('Prompt contains invalid characters'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Validates and sanitizes clip settings from prompt
 * Extracts padding and max results, validates them
 */
export const validateClipSettings = (req: Request, res: Response, next: NextFunction) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return next();
  }

  // Extract padding value from prompt
  const paddingMatch = prompt.match(/include\s+(\d+(?:\.\d+)?)\s+seconds?\s+of\s+padding/i);
  if (paddingMatch) {
    const padding = parseFloat(paddingMatch[1]);
    if (padding > MAX_CLIP_PADDING) {
      return res.status(400).json({ 
        error: `Clip padding cannot exceed ${MAX_CLIP_PADDING} seconds. You requested ${padding} seconds.` 
      });
    }
  }

  // Extract max results from prompt
  const maxResultsMatch = prompt.match(/return\s+at\s+most\s+(\d+)\s+results?/i);
  if (maxResultsMatch) {
    const maxResults = parseInt(maxResultsMatch[1]);
    if (maxResults > MAX_RESULTS) {
      return res.status(400).json({ 
        error: `Maximum results cannot exceed ${MAX_RESULTS}. You requested ${maxResults}.` 
      });
    }
  }

  next();
};

/**
 * Validates authentication token
 */
export const validateAuthToken = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('recaptchaToken')
    .trim()
    .notEmpty().withMessage('reCAPTCHA token is required'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
