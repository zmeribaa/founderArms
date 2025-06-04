const express = require('express');
const { supabase } = require('../config/supabase');
const { taskSchemas, validate, validateQuery } = require('../validation/schemas');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, validateQuery(taskSchemas.query), async (req, res) => {
  const {
    status,
    priority,
    category_id,
    assigned_to,
    due_before,
    due_after,
    page,
    limit,
    sort_by,
    sort_order
  } = req.query;

  let query = supabase
    .from('tasks')
    .select(`
      *,
      category:categories(name, color)
    `, { count: 'exact' })
    .or(`created_by.eq.${req.user.id},assigned_to.eq.${req.user.id}`);

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (category_id) query = query.eq('category_id', category_id);
  if (assigned_to) query = query.eq('assigned_to', assigned_to);
  if (due_before) query = query.lte('due_date', due_before);
  if (due_after) query = query.gte('due_date', due_after);

  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query = query.range(from, to);

  const { data: tasks, error, count } = await query;

  if (error) {
    logger.error('Tasks fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: tasks,
    pagination: {
      page,
      limit,
      total: count,
      pages: totalPages
    }
  });
});

router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      category:categories(name, color)
    `)
    .eq('id', id)
    .or(`created_by.eq.${req.user.id},assigned_to.eq.${req.user.id}`)
    .single();

  if (error) {
    logger.error('Task fetch error:', error);
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  res.json({
    success: true,
    data: task
  });
});

router.post('/', authenticate, validate(taskSchemas.create), async (req, res) => {
  const taskData = {
    ...req.body,
    created_by: req.user.id
  };

  if (taskData.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', taskData.category_id)
      .eq('user_id', req.user.id)
      .single();

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      category:categories(name, color)
    `)
    .single();

  if (error) {
    logger.error('Task creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }

  res.status(201).json({
    success: true,
    data: task
  });
});

router.put('/:id', authenticate, validate(taskSchemas.update), async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (updateData.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', updateData.category_id)
      .eq('user_id', req.user.id)
      .single();

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .or(`created_by.eq.${req.user.id},assigned_to.eq.${req.user.id}`)
    .select(`
      *,
      category:categories(name, color)
    `)
    .single();

  if (error) {
    logger.error('Task update error:', error);
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }

  res.json({
    success: true,
    data: task
  });
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // First check if the task exists and belongs to the user
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', id)
    .eq('created_by', req.user.id)
    .single();

  if (fetchError || !existingTask) {
    return res.status(404).json({
      success: false,
      error: 'Task not found or insufficient permissions'
    });
  }

  // Now delete the task
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('created_by', req.user.id);

  if (error) {
    logger.error('Task deletion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
});

router.patch('/:id/assign', authenticate, async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ assigned_to })
    .eq('id', id)
    .eq('created_by', req.user.id)
    .select(`
      *,
      category:categories(name, color)
    `)
    .single();

  if (error) {
    logger.error('Task assignment error:', error);
    return res.status(404).json({
      success: false,
      error: 'Task not found or insufficient permissions'
    });
  }

  res.json({
    success: true,
    data: task,
    message: 'Task assigned successfully'
  });
});

router.patch('/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['todo', 'in_progress', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value'
    });
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .or(`created_by.eq.${req.user.id},assigned_to.eq.${req.user.id}`)
    .select(`
      *,
      category:categories(name, color)
    `)
    .single();

  if (error) {
    logger.error('Task status update error:', error);
    return res.status(404).json({
      success: false,
      error: 'Task not found or insufficient permissions'
    });
  }

  res.json({
    success: true,
    data: task,
    message: 'Task status updated successfully'
  });
});

module.exports = router; 