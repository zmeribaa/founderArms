const Joi = require('joi');

const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

const categorySchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
  })
};

const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string().valid('todo', 'in_progress', 'completed').default('todo'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    due_date: Joi.date().iso().optional(),
    category_id: Joi.string().uuid().optional(),
    assigned_to: Joi.string().uuid().optional()
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string().valid('todo', 'in_progress', 'completed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    due_date: Joi.date().iso().optional(),
    category_id: Joi.string().uuid().optional(),
    assigned_to: Joi.string().uuid().optional()
  }),

  query: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'completed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    category_id: Joi.string().uuid().optional(),
    assigned_to: Joi.string().uuid().optional(),
    due_before: Joi.date().iso().optional(),
    due_after: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'due_date', 'priority', 'title').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Query validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  authSchemas,
  categorySchemas,
  taskSchemas,
  validate,
  validateQuery
}; 