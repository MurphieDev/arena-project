// netlify/functions/ocr-proxy.js
const https = require('https');
const querystring = require('querystring');

const OCR_API_KEY = process.env.OCR_SPACE_API_KEY || 'K83807854688957';

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { imageUrl, imageBase64, mimeType } = body;

    if (!imageUrl && !imageBase64) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'imageUrl or imageBase64 is required' }),
      };
    }

    let postData;

    if (imageBase64) {
      // Handle base64 image upload
      postData = querystring.stringify({
        base64Image: imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
        apikey: OCR_API_KEY,
        language: 'eng',
        isOverlayRequired: 'false',
        detectOrientation: 'true',
        scale: 'true',
        OCREngine: '2',
        isTable: 'true',
      });
    } else {
      // Handle URL
      postData = querystring.stringify({
        url: imageUrl,
        apikey: OCR_API_KEY,
        language: 'eng',
        isOverlayRequired: 'false',
        detectOrientation: 'true',
        scale: 'true',
        OCREngine: '2',
        isTable: 'true',
      });
    }

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.ocr.space',
        path: '/parse/image',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Failed to parse OCR response')); }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'OCR proxy failed',
        details: error.message,
      }),
    };
  }
};
