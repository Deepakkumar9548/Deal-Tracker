const serverless = require('serverless-http');
const app = require('../../deal-tracker/backend/src/app');

// Export the serverless handler for Netlify
module.exports.handler = serverless(app);
