const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: totalTasks, error: totalError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    const { data: completedTasks, error: completedError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    const { data: inProgressTasks, error: inProgressError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('status', 'in_progress')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    const { data: todoTasks, error: todoError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('status', 'todo')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    const { data: overdueTasks, error: overdueError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .lt('due_date', new Date().toISOString())
      .neq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    if (totalError || completedError || inProgressError || todoError || overdueError) {
      throw new Error('Failed to fetch analytics data');
    }

    const totalCount = totalTasks?.length || 0;
    const completedCount = completedTasks?.length || 0;
    const inProgressCount = inProgressTasks?.length || 0;
    const todoCount = todoTasks?.length || 0;
    const overdueCount = overdueTasks?.length || 0;

    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    res.json({
      success: true,
      data: {
        total_tasks: totalCount,
        completed_tasks: completedCount,
        in_progress_tasks: inProgressCount,
        todo_tasks: todoCount,
        overdue_tasks: overdueCount,
        completion_rate: Math.round(completionRate * 100) / 100,
        status_distribution: {
          todo: todoCount,
          in_progress: inProgressCount,
          completed: completedCount
        }
      }
    });
  } catch (error) {
    logger.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview'
    });
  }
});

router.get('/completion-rates', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;
    
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: completedTasks, error } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString())
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('completed_at', { ascending: true });

    if (error) {
      throw error;
    }

    const dailyCompletions = {};
    const today = new Date();
    
    for (let i = 0; i < daysAgo; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyCompletions[dateKey] = 0;
    }

    completedTasks.forEach(task => {
      if (task.completed_at) {
        const dateKey = task.completed_at.split('T')[0];
        if (dailyCompletions.hasOwnProperty(dateKey)) {
          dailyCompletions[dateKey]++;
        }
      }
    });

    const chartData = Object.entries(dailyCompletions)
      .map(([date, count]) => ({ date, completed_tasks: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        period_days: daysAgo,
        total_completed: completedTasks.length,
        daily_completions: chartData
      }
    });
  } catch (error) {
    logger.error('Completion rates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completion rates'
    });
  }
});

router.get('/overdue-tasks', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        status,
        category:categories(name, color)
      `)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('due_date', { ascending: true });

    if (error) {
      throw error;
    }

    const priorityBreakdown = {
      high: 0,
      medium: 0,
      low: 0
    };

    overdueTasks.forEach(task => {
      priorityBreakdown[task.priority]++;
    });

    res.json({
      success: true,
      data: {
        total_overdue: overdueTasks.length,
        priority_breakdown: priorityBreakdown,
        overdue_tasks: overdueTasks.map(task => ({
          ...task,
          days_overdue: Math.floor(
            (new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24)
          )
        }))
      }
    });
  } catch (error) {
    logger.error('Overdue tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue tasks'
    });
  }
});

router.get('/productivity', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7' } = req.query;
    
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('created_at, completed_at, status, priority')
      .gte('created_at', startDate.toISOString())
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    if (error) {
      throw error;
    }

    const createdTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const averageCompletionTime = tasks
      .filter(task => task.completed_at && task.created_at)
      .reduce((acc, task) => {
        const created = new Date(task.created_at);
        const completed = new Date(task.completed_at);
        const hours = (completed - created) / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / Math.max(completedTasks, 1);

    const priorityStats = {
      high: { created: 0, completed: 0 },
      medium: { created: 0, completed: 0 },
      low: { created: 0, completed: 0 }
    };

    tasks.forEach(task => {
      priorityStats[task.priority].created++;
      if (task.status === 'completed') {
        priorityStats[task.priority].completed++;
      }
    });

    res.json({
      success: true,
      data: {
        period_days: daysAgo,
        tasks_created: createdTasks,
        tasks_completed: completedTasks,
        completion_rate: createdTasks > 0 ? (completedTasks / createdTasks) * 100 : 0,
        average_completion_time_hours: Math.round(averageCompletionTime * 100) / 100,
        priority_performance: priorityStats
      }
    });
  } catch (error) {
    logger.error('Productivity analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch productivity analytics'
    });
  }
});

router.get('/categories', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: categoryStats, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        color,
        tasks:tasks(id, status)
      `)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const categoryAnalytics = categoryStats.map(category => {
      const totalTasks = category.tasks.length;
      const completedTasks = category.tasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = category.tasks.filter(task => task.status === 'in_progress').length;
      const todoTasks = category.tasks.filter(task => task.status === 'todo').length;

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        todo_tasks: todoTasks,
        completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    });

    const { data: uncategorizedTasks, error: uncategorizedError } = await supabase
      .from('tasks')
      .select('id, status')
      .is('category_id', null)
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

    if (uncategorizedError) {
      throw uncategorizedError;
    }

    const uncategorizedTotal = uncategorizedTasks.length;
    const uncategorizedCompleted = uncategorizedTasks.filter(task => task.status === 'completed').length;

    if (uncategorizedTotal > 0) {
      categoryAnalytics.push({
        id: null,
        name: 'Uncategorized',
        color: '#6b7280',
        total_tasks: uncategorizedTotal,
        completed_tasks: uncategorizedCompleted,
        in_progress_tasks: uncategorizedTasks.filter(task => task.status === 'in_progress').length,
        todo_tasks: uncategorizedTasks.filter(task => task.status === 'todo').length,
        completion_rate: (uncategorizedCompleted / uncategorizedTotal) * 100
      });
    }

    res.json({
      success: true,
      data: categoryAnalytics.sort((a, b) => b.total_tasks - a.total_tasks)
    });
  } catch (error) {
    logger.error('Category analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category analytics'
    });
  }
});

module.exports = router; 