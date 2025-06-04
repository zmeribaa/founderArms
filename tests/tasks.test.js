const request = require('supertest');
const app = require('../src/server');

describe('Task Management Endpoints', () => {
  let authToken;
  let userId;
  let taskId;
  let categoryId;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    full_name: 'Test User'
  };

  const testCategory = {
    name: 'Test Category',
    description: 'A test category for tasks',
    color: '#FF5733'
  };

  const testTask = {
    title: 'Test Task',
    description: 'This is a test task',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (registerResponse.body.data.access_token) {
      authToken = registerResponse.body.data.access_token;
      userId = registerResponse.body.data.user.id;
    } else {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      authToken = loginResponse.body.data.access_token;
      userId = loginResponse.body.data.user.id;
    }

    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testCategory);
    
    if (categoryResponse.body.success) {
      categoryId = categoryResponse.body.data.id;
    }
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testTask)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testTask.title);
      expect(response.body.data.description).toBe(testTask.description);
      expect(response.body.data.status).toBe(testTask.status);
      expect(response.body.data.priority).toBe(testTask.priority);
      expect(response.body.data.created_by).toBe(userId);

      taskId = response.body.data.id;
    });

    it('should create a task with category', async () => {
      const taskWithCategory = {
        ...testTask,
        title: 'Task with Category',
        category_id: categoryId
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskWithCategory)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category_id).toBe(categoryId);
      expect(response.body.data.category).toBeDefined();
    });

    it('should fail with invalid category ID', async () => {
      const taskWithInvalidCategory = {
        ...testTask,
        title: 'Task with Invalid Category',
        category_id: '00000000-0000-0000-0000-000000000000'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskWithInvalidCategory)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid category ID');
    });

    it('should fail with missing title', async () => {
      const invalidTask = {
        description: 'Task without title',
        status: 'todo'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTask)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send(testTask)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(task => {
        expect(task.status).toBe('todo');
      });
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=medium')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(task => {
        expect(task.priority).toBe('medium');
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should sort tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?sort_by=title&sort_order=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].title >= response.body.data[i-1].title).toBe(true);
        }
      }
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get a specific task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe(testTask.title);
    });

    it('should fail with invalid task ID', async () => {
      const response = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task successfully', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.priority).toBe(updateData.priority);
    });

    it('should fail to update non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status successfully', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.message).toBe('Task status updated successfully');
    });

    it('should complete a task and set completed_at', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completed_at).toBeDefined();
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status value');
    });
  });

  describe('PATCH /api/tasks/:id/assign', () => {
    it('should assign task to user successfully', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assigned_to: userId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assigned_to).toBe(userId);
      expect(response.body.message).toBe('Task assigned successfully');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should fail to delete non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found or insufficient permissions');
    });
  });
}); 