const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authSchemas, validate } = require('../validation/schemas');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         full_name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         created_at:
 *           type: string
 *           format: date-time
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             access_token:
 *               type: string
 *             refresh_token:
 *               type: string
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - full_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               full_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', validate(authSchemas.register), async (req, res) => {
  const { email, password, full_name } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name
      }
    }
  });

  if (error) {
    logger.error('Registration error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Create profile in our custom table
  if (data.user) {
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata.full_name || full_name
        });

      if (profileError) {
        logger.error('Profile creation error:', profileError);
        // Don't fail registration if profile creation fails
      }
    } catch (profileError) {
      logger.error('Profile creation error:', profileError);
    }
  }

  if (data.user && !data.session) {
    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to confirm your account.',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata.full_name || full_name
        }
      }
    });
  }

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name || full_name
      },
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token
    }
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(authSchemas.login), async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    logger.error('Login error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Logout error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, async (req, res) => {
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create it
    try {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata.full_name || 'User'
        })
        .select()
        .single();

      if (createError) {
        logger.error('Profile creation error:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create profile'
        });
      }

      profile = newProfile;
    } catch (createError) {
      logger.error('Profile creation error:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create profile'
      });
    }
  } else if (error) {
    logger.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }

  res.json({
    success: true,
    data: profile
  });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token required'
    });
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token
  });

  if (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }
  });
});

module.exports = router; 