const express = require('express');
const { supabase } = require('../config/supabase');
const { categorySchemas, validate } = require('../validation/schemas');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-F]{6}$'
 *         user_id:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req, res) => {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Categories fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }

  res.json({
    success: true,
    data: categories
  });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a specific category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error) {
    logger.error('Category fetch error:', error);
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: category
  });
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error or duplicate category name
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validate(categorySchemas.create), async (req, res) => {
  const { name, description, color } = req.body;

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      name,
      description,
      color,
      user_id: req.user.id
    })
    .select()
    .single();

  if (error) {
    logger.error('Category creation error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }

  res.status(201).json({
    success: true,
    data: category
  });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticate, validate(categorySchemas.update), async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const { data: category, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) {
    logger.error('Category update error:', error);
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }

  res.json({
    success: true,
    data: category
  });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) {
    logger.error('Category deletion error:', error);
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
});

/**
 * @swagger
 * /api/categories/{id}/tasks:
 *   get:
 *     summary: Get all tasks in a specific category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/tasks', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      category:categories(name, color)
    `)
    .eq('category_id', id)
    .or(`created_by.eq.${req.user.id},assigned_to.eq.${req.user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Category tasks fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }

  res.json({
    success: true,
    data: tasks
  });
});

module.exports = router; 