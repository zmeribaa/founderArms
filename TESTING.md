# API Testing Guide

This guide provides step-by-step instructions for testing the Task Management API.

## Prerequisites

1. **Set up Supabase Database:**
   ```bash
   npm run migrate
   ```
   Copy the SQL output and run it in your Supabase SQL Editor.

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Verify server is running:**
   ```bash
   curl http://localhost:3000/health
   ```

## Testing Endpoints

### 1. Authentication Tests

#### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Save the access_token from the response for subsequent requests!**

#### Get user profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Category Tests

#### Create a category
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Work",
    "description": "Work-related tasks",
    "color": "#FF5733"
  }'
```

#### Get all categories
```bash
curl -X GET http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Update a category
```bash
curl -X PUT http://localhost:3000/api/categories/CATEGORY_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Updated Work",
    "description": "Updated description"
  }'
```

### 3. Task Tests

#### Create a task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Complete API Testing",
    "description": "Test all endpoints thoroughly",
    "status": "todo",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59Z",
    "category_id": "CATEGORY_ID_HERE"
  }'
```

#### Get all tasks
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get tasks with filters
```bash
# Filter by status
curl -X GET "http://localhost:3000/api/tasks?status=todo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by priority
curl -X GET "http://localhost:3000/api/tasks?priority=high" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Pagination
curl -X GET "http://localhost:3000/api/tasks?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Sorting
curl -X GET "http://localhost:3000/api/tasks?sort_by=title&sort_order=asc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Update a task
```bash
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Updated Task Title",
    "priority": "medium"
  }'
```

#### Update task status
```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "status": "completed"
  }'
```

#### Assign task to user
```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "assigned_to": "USER_ID_HERE"
  }'
```

### 4. Analytics Tests

#### Get overview analytics
```bash
curl -X GET http://localhost:3000/api/analytics/overview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get completion rates
```bash
curl -X GET "http://localhost:3000/api/analytics/completion-rates?period=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get overdue tasks
```bash
curl -X GET http://localhost:3000/api/analytics/overdue-tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get productivity metrics
```bash
curl -X GET "http://localhost:3000/api/analytics/productivity?period=7" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get category analytics
```bash
curl -X GET http://localhost:3000/api/analytics/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Using Postman/Insomnia

1. **Import the API:**
   - Visit `http://localhost:3000/api-docs`
   - Download the OpenAPI spec
   - Import into Postman/Insomnia

2. **Set up environment variables:**
   - `base_url`: `http://localhost:3000`
   - `access_token`: (get from login response)

## Running Automated Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Testing Scheduled Jobs

The API includes scheduled jobs that run automatically:

- **Daily Digest**: 8:00 AM UTC
- **Overdue Check**: Every 6 hours
- **Weekly Cleanup**: Sunday 2:00 AM UTC
- **Statistics Update**: Midnight UTC

To test these manually, you can call the functions directly in the Node.js console:

```javascript
const { generateDailyDigest, checkOverdueTasks } = require('./src/jobs/scheduledJobs');

// Test daily digest
generateDailyDigest();

// Test overdue check
checkOverdueTasks();
```

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ] // For validation errors
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## Common Issues & Solutions

1. **401 Unauthorized**: Check if your access token is valid and properly formatted
2. **404 Not Found**: Verify the endpoint URL and resource IDs
3. **400 Bad Request**: Check request body format and required fields
4. **500 Server Error**: Check server logs for detailed error information

## Performance Testing

For load testing, you can use tools like:

```bash
# Install artillery
npm install -g artillery

# Create a test script (artillery-test.yml)
# Run load test
artillery run artillery-test.yml
```

## Security Testing

1. **Test without authentication:**
   ```bash
   curl -X GET http://localhost:3000/api/tasks
   # Should return 401
   ```

2. **Test with invalid token:**
   ```bash
   curl -X GET http://localhost:3000/api/tasks \
     -H "Authorization: Bearer invalid_token"
   # Should return 401
   ```

3. **Test rate limiting:**
   ```bash
   # Make 101 requests quickly to test rate limiting
   for i in {1..101}; do
     curl -X GET http://localhost:3000/health &
   done
   ```

## API Documentation

Visit `http://localhost:3000/api-docs` for interactive API documentation with Swagger UI. 