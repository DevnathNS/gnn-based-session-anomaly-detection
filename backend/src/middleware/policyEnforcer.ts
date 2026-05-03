import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';
import fs from 'fs';
import path from 'path';
import scoringConfig from '../config/scoring-rules.json';

/**
 * Get the required minimum score for an endpoint
 * Uses pattern matching (supports wildcards)
 *
 * Examples:
 *   getRequiredScore('/api/admin/users') => 85
 *   getRequiredScore('/api/user/profile') => 50
 *   getRequiredScore('/api/public/news') => 0
 */
function getRequiredScore(endpoint: string): number {
  // Try exact match first
  const policies = scoringConfig.endpoint_policies;
  
  if (policies[endpoint]!==undefined) {
    return policies[endpoint];
  }

  // Try pattern match (with wildcard)
  for (const [pattern, score] of Object.entries(policies)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      if (regex.test(endpoint)) {
        return score as number;
      }
    }
  }

  // Default: require medium trust for unknown endpoints
  return 50;
}

/**
 * Determine access tier based on score
 *
 * Tiers:
 * - Full (80-100): All endpoints accessible
 * - Limited (50-79): Can't access admin/sensitive, read-only on user
 * - Restricted (20-49): Only public endpoints
 * - Blocked (0-19): Session likely compromised
 */
function getAccessTier(score: number): 'full' | 'limited' | 'restricted' | 'blocked' {
  const tiers = scoringConfig.tiers;
  if (score >= tiers.full.min) return 'full';
  if (score >= tiers.limited.min) return 'limited';
  if (score >= tiers.restricted.min) return 'restricted';
  return 'blocked';
}

/**
 * Policy Enforcer Middleware
 *
 * Checks if user's trust score meets endpoint requirements
 * Blocks, allows, or requests step-up authentication
 * 
 * Skips public endpoints that don't require policy checks
 *
 * Usage:
 *   app.use('/api/*', authMiddleware, sessionTrackerMiddleware, policyEnforcerMiddleware);
 */
export async function policyEnforcerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip policy enforcement for public endpoints
    if (req.path.startsWith('/public/')) {
      return next();
    }

    // 1. Get sessionId
    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(401).json({
        error: 'Missing session',
        message: 'Session ID not found',
      });
    }

    // 2. Get current trust score from Redis
    const scoreKey = `session:${sessionId}:trust_score`;
    const scoreStr = await redisClient.get(scoreKey);
    const currentScore = scoreStr ? parseInt(scoreStr) : 0;

    // 3. Get required score for this endpoint
    // The policy patterns are defined with /api/... but the routes are mounted with it. 
    // Wait, the router is mounted in server.ts as app.use('/api', ...).
    // Let's check req.originalUrl instead of req.path to match /api/...
    const endpoint = req.originalUrl.split('?')[0]; // use original url and remove query string
    const requiredScore = getRequiredScore(endpoint);

    // 4. Determine access tier
    const tier = getAccessTier(currentScore);

    // 5. Log for debugging
    console.log(
      `[POLICY] ${req.method} ${endpoint} | Score: ${currentScore}/${requiredScore} | Tier: ${tier}`
    );

    // 6. Attach policy info to request for downstream use
    (req as any).policyInfo = {
      currentScore,
      requiredScore,
      tier,
      canStepUp: currentScore >= 20,
    };

    // 7. Enforce policy based on score and tier
    if (currentScore >= requiredScore) {
      // ✅ Access allowed
      console.log(`[ALLOW] ${req.method} ${endpoint}`);
      return next();
    }

    // ❌ Access denied - determine response type

    if (tier === 'blocked') {
      // Session is too compromised - terminate immediately
      console.log(`[BLOCK] ${req.method} ${endpoint} - Session blocked`);
      return res.status(403).json({
        error: 'Session terminated',
        message: 'Your session has been terminated due to suspicious activity. Please login again.',
        tier: 'blocked',
        currentScore,
        requiredScore,
      });
    }

    if (currentScore >= 20) {
      // Score is between 20-79 - offer step-up authentication
      console.log(`[STEP-UP] ${req.method} ${endpoint} - Step-up required`);
      return res.status(401).json({
        error: 'Step-up authentication required',
        message: 'Your trust score is too low for this action. Please verify your identity.',
        tier: getAccessTier(currentScore),
        currentScore,
        requiredScore,
        deficit: requiredScore - currentScore,
        stepUpReward: 30,
        alternatives: getAlternatives(endpoint),
      });
    }

    // Score < 20 - access denied
    console.log(`[DENY] ${req.method} ${endpoint} - Score too low`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your trust score is too low. Please logout and login again.',
      tier: 'restricted',
      currentScore,
      requiredScore,
    });
  } catch (error) {
    console.error('Policy enforcement error:', error);
    return res.status(500).json({
      error: 'Policy enforcement failed',
      message: 'An error occurred while checking access policy',
    });
  }
}

/**
 * Suggest alternative actions user can take
 * Based on which endpoint they tried to access
 *
 * Examples:
 *   - Can't access /api/admin/users → suggest /api/user/profile
 *   - Can't access /api/payments/transfer → suggest /api/user/settings
 */
function getAlternatives(endpoint: string): string[] {
  if (endpoint.startsWith('/api/admin')) {
    return ['/api/user/profile', '/api/user/settings', '/api/public/news'];
  }
  if (endpoint.startsWith('/api/payments')) {
    return ['/api/user/profile', '/api/user/settings'];
  }
  if (endpoint.startsWith('/api/data')) {
    return ['/api/user/profile', '/api/public/news'];
  }
  return ['/api/public/news', '/api/public/about'];
}

/**
 * Override policy for testing/admin
 * Allows admin to force-allow certain sessions
 *
 * Usage:
 *   await overridePolicy(sessionId, true);  // Force allow
 *   await overridePolicy(sessionId, false); // Remove override
 */
export async function overridePolicy(
  sessionId: string,
  shouldOverride: boolean
): Promise<boolean> {
  try {
    const key = `session:${sessionId}:policy_override`;
    if (shouldOverride) {
      await redisClient.set(key, 'true', 3600); // 1 hour override
      console.log(`[OVERRIDE] Policy override enabled for session ${sessionId}`);
      return true;
    } else {
      await redisClient.del(key);
      console.log(`[OVERRIDE] Policy override disabled for session ${sessionId}`);
      return true;
    }
  } catch (error) {
    console.error('Error setting policy override:', error);
    return false;
  }
}

/**
 * Get current policy rules
 * Useful for debugging and frontend display
 *
 * Usage:
 *   const policies = getPolicies();
 */
export function getPolicies(): Record<string, number> {
  return { ...scoringConfig.endpoint_policies };
}

/**
 * Update policy for an endpoint
 * Useful for fine-tuning requirements
 *
 * Usage:
 *   updateEndpointPolicy('/api/admin/users', 80);
 */
export function updateEndpointPolicy(endpoint: string, minScore: number): void {
  const policies = scoringConfig.endpoint_policies
  policies[endpoint] = Math.max(0, Math.min(100, minScore));
  console.log(
    `[POLICY] Updated ${endpoint} to require score ${policies[endpoint]}`
  );
}

/**
 * Check if a score would pass for an endpoint
 * Useful for frontend to show what's accessible
 *
 * Usage:
 *   const canAccess = wouldPassPolicy('/api/admin/users', 75);  // false
 *   const canAccess = wouldPassPolicy('/api/user/profile', 75); // true
 */
export function wouldPassPolicy(endpoint: string, score: number): boolean {
  const required = getRequiredScore(endpoint);
  return score >= required;
}
