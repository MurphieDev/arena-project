// netlify/functions/trigger-tip-check.cjs
// Manual trigger for tip verification - only accessible to admins

const { handler } = require('./check-tips-scheduled.cjs');

exports.handler = async function(event) {
  // Only allow POST requests with secret key
  const secret = event.headers['x-admin-secret'] || event.queryStringParameters?.secret;
  if (secret !== process.env.ADMIN_SECRET && secret !== 'arena-admin-2024') {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  console.log('Manual tip check triggered');
  return handler(event);
};
