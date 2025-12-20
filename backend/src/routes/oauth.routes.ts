import { Router, Request, Response } from 'express';
import passport from '../config/passport';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getQuotaStatus } from '../services/user.service';
import { oauthLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  oauthLimiter,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed`,
    session: false,
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}?error=no_user`);
      }

      // Generate JWT token
      const token = generateToken(user.id, user.email);
      
      // Get quota status
      const quota = getQuotaStatus(user.id);

      // Redirect to frontend with token in URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
      
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}?error=callback_failed`);
    }
  }
);

/**
 * GET /auth/quota
 * Get current user's quota status (requires authentication)
 */
router.get('/quota', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const quota = getQuotaStatus(userId);

    if (!quota) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ quota });
  } catch (error: any) {
    console.error('Quota check error:', error);
    res.status(500).json({ error: 'Failed to retrieve quota' });
  }
});

export default router;
