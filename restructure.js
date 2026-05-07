const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'deal-tracker');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');

const directories = [
  // Backend
  'backend/src/config',
  'backend/src/modules/auth',
  'backend/src/modules/user',
  'backend/src/modules/deals',
  'backend/src/modules/upload',
  'backend/src/modules/analytics',
  'backend/src/modules/reports',
  'backend/src/modules/audit',
  'backend/src/common/middlewares',
  'backend/src/common/utils',
  'backend/src/common/constants',
  'backend/src/common/validators',
  'backend/src/queues',
  'backend/src/jobs',
  'backend/src/services',
  'backend/src/controllers',
  'backend/src/routes',
  'backend/src/models',
  'backend/workers',
  'backend/uploads',
  'backend/logs',
  
  // Frontend
  'frontend/src/app/api',
  'frontend/src/modules/auth',
  'frontend/src/modules/dashboard',
  'frontend/src/modules/upload',
  'frontend/src/modules/deals',
  'frontend/src/modules/analytics',
  'frontend/src/modules/reports',
  'frontend/src/components/common',
  'frontend/src/components/ui',
  'frontend/src/hooks',
  'frontend/src/utils',
  'frontend/src/routes',
  'frontend/src/layouts'
];

const filesToCreate = [
  'backend/src/config/db.config.js',
  'backend/src/config/redis.config.js',
  'backend/src/config/env.config.js',
  'backend/src/config/logger.config.js',
  'backend/src/common/middlewares/auth.middleware.js',
  'backend/src/common/middlewares/role.middleware.js',
  'backend/src/common/middlewares/error.middleware.js',
  'backend/src/common/middlewares/rateLimiter.js',
  'backend/src/common/utils/excelStreamParser.js',
  'backend/src/common/utils/chunkProcessor.js',
  'backend/src/common/utils/logger.js',
  'backend/src/common/utils/responseHandler.js',
  'backend/src/queues/upload.queue.js',
  'backend/src/queues/worker.js',
  'backend/src/queues/queueEvents.js',
  'backend/src/jobs/excelProcessor.job.js',
  'backend/src/jobs/analytics.job.js',
  'backend/src/jobs/report.job.js',
  'backend/src/services/upload.service.js',
  'backend/src/services/deal.service.js',
  'backend/src/services/report.service.js',
  'backend/workers/excel.worker.js',
  'backend/workers/analytics.worker.js',
  'backend/workers/report.worker.js',
  'frontend/src/app/store.js'
];

console.log('Restructuring the architecture to Enterprise-grade...');

// Create directories
directories.forEach(dir => {
  const fullPath = path.join(root, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create stub files if they don't exist
filesToCreate.forEach(file => {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, '// TODO: Implement\nmodule.exports = {};\n');
    console.log(`Created file: ${file}`);
  }
});

console.log('Done organizing folders. Please move existing models, routes, and controllers into the new domain-driven `modules/` or top-level folders as per your business logic preference.');
