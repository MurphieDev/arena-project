// netlify/functions/trigger-tip-check.cjs
const checkTips = require('./check-tips-scheduled.cjs');

exports.handler = async function(event) {
  const secret = (event.queryStringParameters || {}).secret || (event.headers || {})['x-admin-secret'];
  if (secret !== 'arena-admin-2024') {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  console.log('Manual tip check triggered');
  return checkTips.handler(event);
};
