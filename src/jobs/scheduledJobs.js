const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

const generateDailyDigest = async () => {
  try {
    logger.info('Starting daily digest generation...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (usersError) {
      throw usersError;
    }

    for (const user of users) {
      try {
        const { data: completedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('status', 'completed')
          .gte('completed_at', yesterday.toISOString())
          .lt('completed_at', today.toISOString())
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);

        const { data: overdueTasks, error: overdueError } = await supabase
          .from('tasks')
          .select('id, title, due_date, priority')
          .lt('due_date', today.toISOString())
          .neq('status', 'completed')
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);

        const { data: dueTodayTasks, error: dueTodayError } = await supabase
          .from('tasks')
          .select('id, title, due_date, priority')
          .gte('due_date', today.toISOString().split('T')[0])
          .lt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .neq('status', 'completed')
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);

        if (completedError || overdueError || dueTodayError) {
          logger.error(`Error fetching digest data for user ${user.id}:`, {
            completedError,
            overdueError,
            dueTodayError
          });
          continue;
        }

        const digest = {
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          date: today.toISOString().split('T')[0],
          completed_yesterday: completedTasks?.length || 0,
          overdue_tasks: overdueTasks?.length || 0,
          due_today: dueTodayTasks?.length || 0,
          completed_tasks: completedTasks || [],
          overdue_task_details: overdueTasks || [],
          due_today_details: dueTodayTasks || []
        };

        logger.info(`Daily digest for ${user.email}:`, {
          completed_yesterday: digest.completed_yesterday,
          overdue_tasks: digest.overdue_tasks,
          due_today: digest.due_today
        });

      } catch (userError) {
        logger.error(`Error generating digest for user ${user.id}:`, userError);
      }
    }

    logger.info('Daily digest generation completed');
  } catch (error) {
    logger.error('Daily digest generation failed:', error);
  }
};

const checkOverdueTasks = async () => {
  try {
    logger.info('Checking for overdue tasks...');

    const now = new Date();
    
    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        created_by,
        assigned_to,
        creator:profiles!tasks_created_by_fkey(full_name, email),
        assigned_user:profiles!tasks_assigned_to_fkey(full_name, email)
      `)
      .lt('due_date', now.toISOString())
      .neq('status', 'completed');

    if (error) {
      throw error;
    }

    const overdueCount = overdueTasks.length;
    
    if (overdueCount > 0) {
      logger.warn(`Found ${overdueCount} overdue tasks`);
      
      const priorityBreakdown = overdueTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {});

      logger.info('Overdue tasks by priority:', priorityBreakdown);
    } else {
      logger.info('No overdue tasks found');
    }

  } catch (error) {
    logger.error('Overdue task check failed:', error);
  }
};

const cleanupCompletedTasks = async () => {
  try {
    logger.info('Starting cleanup of old completed tasks...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('status', 'completed')
      .lt('completed_at', thirtyDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (oldTasks && oldTasks.length > 0) {
      logger.info(`Found ${oldTasks.length} completed tasks older than 30 days`);
      
    } else {
      logger.info('No old completed tasks found for cleanup');
    }

  } catch (error) {
    logger.error('Task cleanup failed:', error);
  }
};

const updateTaskStatistics = async () => {
  try {
    logger.info('Updating task statistics...');

    const { data: stats, error } = await supabase
      .from('tasks')
      .select('status, priority, created_by')
      .neq('status', 'deleted');

    if (error) {
      throw error;
    }

    const totalTasks = stats.length;
    const statusBreakdown = stats.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const priorityBreakdown = stats.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    logger.info('Task statistics updated:', {
      total_tasks: totalTasks,
      status_breakdown: statusBreakdown,
      priority_breakdown: priorityBreakdown
    });

  } catch (error) {
    logger.error('Statistics update failed:', error);
  }
};

const startScheduledJobs = () => {
  logger.info('Starting scheduled jobs...');

  cron.schedule('0 8 * * *', () => {
    logger.info('Running daily digest job at 8:00 AM');
    generateDailyDigest();
  }, {
    timezone: 'UTC'
  });

  cron.schedule('0 */6 * * *', () => {
    logger.info('Running overdue task check every 6 hours');
    checkOverdueTasks();
  }, {
    timezone: 'UTC'
  });

  cron.schedule('0 2 * * 0', () => {
    logger.info('Running weekly cleanup on Sunday at 2:00 AM');
    cleanupCompletedTasks();
  }, {
    timezone: 'UTC'
  });

  cron.schedule('0 0 * * *', () => {
    logger.info('Running daily statistics update at midnight');
    updateTaskStatistics();
  }, {
    timezone: 'UTC'
  });

  logger.info('All scheduled jobs started successfully');
};

const stopScheduledJobs = () => {
  logger.info('Stopping all scheduled jobs...');
  cron.getTasks().forEach(task => task.stop());
  logger.info('All scheduled jobs stopped');
};

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  generateDailyDigest,
  checkOverdueTasks,
  cleanupCompletedTasks,
  updateTaskStatistics
}; 