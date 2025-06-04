require('dotenv').config();

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const migrations = [
  {
    name: '001_create_profiles_table',
    sql: `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and create trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and create RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
    `
  },
  {
    name: '002_create_categories_table',
    sql: `
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Drop and create trigger for categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop and create RLS policy
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);
    `
  },
  {
    name: '003_create_tasks_table',
    sql: `
-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop and create trigger for tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create completed_at trigger function
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and create trigger for completed_at
DROP TRIGGER IF EXISTS set_task_completed_at ON tasks;
CREATE TRIGGER set_task_completed_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop and create RLS policies
DROP POLICY IF EXISTS "Users can manage tasks they created" ON tasks;
CREATE POLICY "Users can manage tasks they created" ON tasks
  FOR ALL USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
CREATE POLICY "Users can view tasks assigned to them" ON tasks
  FOR SELECT USING (auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON tasks;
CREATE POLICY "Users can update tasks assigned to them" ON tasks
  FOR UPDATE USING (auth.uid() = assigned_to);
    `
  },
  {
    name: '004_create_task_comments_table',
    sql: `
-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop and create trigger for task_comments
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at 
  BEFORE UPDATE ON task_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Drop and create RLS policy
DROP POLICY IF EXISTS "Users can manage comments on accessible tasks" ON task_comments;
CREATE POLICY "Users can manage comments on accessible tasks" ON task_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );
    `
  }
];

async function runMigrations() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY.');
  }

  logger.info('Starting database migrations...');
  logger.info('');
  logger.info('='.repeat(80));
  logger.info('MANUAL MIGRATION REQUIRED');
  logger.info('='.repeat(80));
  logger.info('');
  logger.info('Please copy and paste the following SQL into your Supabase SQL Editor:');
  logger.info('(Go to your Supabase Dashboard > SQL Editor > New Query)');
  logger.info('');

  let allSQL = '';
  
  for (const migration of migrations) {
    logger.info(`-- ${migration.name}`);
    logger.info(migration.sql);
    logger.info('');
    allSQL += `-- ${migration.name}\n${migration.sql}\n\n`;
  }

  logger.info('='.repeat(80));
  logger.info('');
  logger.info('Complete SQL script (copy this entire block):');
  logger.info('');
  logger.info(allSQL);
  logger.info('='.repeat(80));
  logger.info('');
  logger.info('After running the SQL in Supabase, your database will be ready!');
  logger.info('Then you can start the server with: npm run dev');
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration instructions displayed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations }; 