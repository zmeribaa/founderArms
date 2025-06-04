# Task Management API

A comprehensive RESTful API for task management built with Express.js and Supabase, featuring user authentication, CRUD operations, analytics, and scheduled jobs.

## 🚀 Features

- **User Authentication**: Secure registration, login, and JWT-based authentication using Supabase Auth
- **Task Management**: Full CRUD operations with filtering, pagination, and sorting
- **Category System**: Organize tasks with customizable categories
- **Task Assignment**: Assign tasks to users and track ownership
- **Analytics Dashboard**: Task completion rates, overdue tasks, and productivity metrics
- **Scheduled Jobs**: Daily digest generation and automated task monitoring
- **Data Validation**: Comprehensive input validation using Joi
- **Error Handling**: Centralized error handling with detailed logging
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Test Coverage**: Comprehensive test suite with Jest and Supertest

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Validation**: Joi
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Scheduling**: node-cron
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18 or higher)
- Supabase account and project
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-management-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from the project settings
3. Enable Row Level Security (RLS) in your Supabase project
4. Run the database migrations:

```bash
npm run migrate
```

### 5. Create Required Directories

```bash
mkdir -p logs
```

### 6. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api-docs`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/auth/refresh` | Refresh access token |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get tasks with filtering and pagination |
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks/:id` | Get specific task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/status` | Update task status |
| PATCH | `/api/tasks/:id/assign` | Assign task to user |

### Category Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create new category |
| GET | `/api/categories/:id` | Get specific category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |
| GET | `/api/categories/:id/tasks` | Get tasks in category |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Get task overview statistics |
| GET | `/api/analytics/completion-rates` | Get completion rate trends |
| GET | `/api/analytics/overdue-tasks` | Get overdue tasks analysis |
| GET | `/api/analytics/productivity` | Get productivity metrics |
| GET | `/api/analytics/categories` | Get category-wise analytics |

## 🗄 Database Schema

### Tables

1. **profiles** - User profile information
2. **categories** - Task categories
3. **tasks** - Main tasks table
4. **task_comments** - Task comments (future feature)

### Key Relationships

- Users can have multiple categories
- Categories can have multiple tasks
- Tasks belong to one category (optional)
- Tasks can be assigned to users
- Tasks are created by users

### Row Level Security (RLS)

All tables implement RLS policies to ensure users can only access their own data:
- Users can only see/modify their own profiles
- Users can only manage categories they created
- Users can only access tasks they created or are assigned to

## 🔐 Authentication Flow

1. **Registration**: User registers with email, password, and full name
2. **Email Verification**: Supabase sends verification email (if enabled)
3. **Login**: User logs in with email and password
4. **JWT Token**: Supabase returns access and refresh tokens
5. **API Access**: Include `Authorization: Bearer <token>` header in requests
6. **Token Refresh**: Use refresh token to get new access token when expired

## 📊 Analytics Features

### Overview Dashboard
- Total tasks count
- Completed tasks count
- In-progress tasks count
- Todo tasks count
- Overdue tasks count
- Overall completion rate

### Completion Rate Trends
- Daily completion counts over specified period
- Configurable time periods (7, 30, 90 days)
- Visual data for charting

### Overdue Tasks Analysis
- List of overdue tasks with details
- Priority breakdown of overdue tasks
- Days overdue calculation

### Productivity Metrics
- Tasks created vs completed in period
- Average completion time
- Priority-based performance analysis

### Category Analytics
- Task distribution across categories
- Completion rates per category
- Category performance comparison

## ⏰ Scheduled Jobs

The API includes several automated jobs:

1. **Daily Digest** (8:00 AM UTC)
   - Generates daily summary for each user
   - Includes completed tasks from yesterday
   - Lists overdue and due-today tasks

2. **Overdue Task Check** (Every 6 hours)
   - Monitors for overdue tasks
   - Logs priority breakdown
   - Can be extended for notifications

3. **Weekly Cleanup** (Sunday 2:00 AM UTC)
   - Identifies old completed tasks
   - Prepares for potential archival

4. **Daily Statistics** (Midnight UTC)
   - Updates system-wide task statistics
   - Generates performance metrics

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:
- Authentication endpoints
- Task CRUD operations
- Category management
- Input validation
- Error handling
- Authorization checks

### Test Structure

```
tests/
├── setup.js          # Test configuration
├── auth.test.js       # Authentication tests
├── tasks.test.js      # Task management tests
└── categories.test.js # Category tests (can be added)
```

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
JWT_SECRET=your_strong_jwt_secret
```

### Deployment Platforms

The API can be deployed to:
- **Heroku**: Add Procfile with `web: node src/server.js`
- **Railway**: Direct deployment from Git
- **DigitalOcean App Platform**: Configure build and run commands
- **AWS/GCP/Azure**: Use container deployment

### Health Check

The API includes a health check endpoint:
```
GET /health
```

Returns server status, uptime, and timestamp.

## 🔧 Development

### Project Structure

```
src/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── routes/          # API route handlers
├── validation/      # Input validation schemas
├── utils/           # Utility functions
├── jobs/            # Scheduled job definitions
├── migrations/      # Database migration scripts
└── server.js        # Main application entry point
```

### Code Style

- Use ES6+ features
- Follow RESTful API conventions
- Implement proper error handling
- Add comprehensive logging
- Write descriptive commit messages

### Adding New Features

1. Create route handlers in `src/routes/`
2. Add validation schemas in `src/validation/`
3. Update Swagger documentation
4. Write comprehensive tests
5. Update README if needed

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure RLS policies are correct

2. **Authentication Failures**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Ensure Supabase Auth is enabled

3. **Migration Errors**
   - Verify service role key permissions
   - Check SQL syntax in migration files
   - Ensure database is accessible

### Logging

Logs are written to:
- Console (development)
- `logs/error.log` (error level)
- `logs/combined.log` (all levels)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Supabase** for providing excellent backend-as-a-service
- **Express.js** community for the robust web framework
- **Jest** team for the testing framework
- **Swagger** for API documentation tools

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the test files for usage examples

---

## AI Tools Usage

This project was developed with assistance from AI tools in the following areas:

1. **Code Structure**: AI helped design the overall project architecture and folder structure following Express.js best practices.

2. **Database Schema**: AI assisted in designing the PostgreSQL schema with proper relationships and RLS policies for Supabase.

3. **API Documentation**: Swagger/OpenAPI documentation was generated with AI assistance to ensure comprehensive coverage.

4. **Test Cases**: AI helped create comprehensive test suites covering various scenarios and edge cases.

5. **Error Handling**: AI contributed to implementing robust error handling patterns and validation schemas.

6. **Security Implementation**: AI assisted in implementing security best practices including authentication, authorization, and input validation.

The core business logic, database design decisions, and architectural choices were made by the development team, with AI serving as a productivity enhancement tool for code generation and documentation.