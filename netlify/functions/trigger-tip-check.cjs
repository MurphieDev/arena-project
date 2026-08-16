// netlify/functions/trigger-tip-check.cjs
/* eslint-disable */

exports.handler = async function (event) {
  const params = event ? (event.queryStringParameters || {}) : {};
  const headers = event ? (event.headers || {}) : {};
  const secret = params.secret || headers['x-admin-secret'] || '';

  if (secret !== 'arena-admin-2024') {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  // Diagnose the environment variables WITHOUT exposing their values.
  const diagnostic = {
    projectId: {
      exists: !!projectId,
      length: projectId.length,
      looksValid: projectId.length > 0 && !projectId.includes('undefined'),
    },

    clientEmail: {
      exists: !!clientEmail,
      length: clientEmail.length,
      looksValid:
        clientEmail.includes('@') &&
        clientEmail.includes('.'),
    },

    privateKey: {
      exists: !!rawPrivateKey,
      length: rawPrivateKey.length,
      hasBeginMarker: rawPrivateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasEndMarker: rawPrivateKey.includes('-----END PRIVATE KEY-----'),
      hasLiteralNewlines: rawPrivateKey.includes('\\n'),
      hasActualNewlines: rawPrivateKey.includes('\n'),
      startsWithQuote:
        rawPrivateKey.startsWith('"') ||
        rawPrivateKey.startsWith("'"),
      endsWithQuote:
        rawPrivateKey.endsWith('"') ||
        rawPrivateKey.endsWith("'"),
    },
  };

  // Stop here if any Firebase environment variable is missing.
  if (!projectId || !clientEmail || !rawPrivateKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        stage: 'environment_variables',
        diagnostic,
      }),
    };
  }

  try {
    const {
      initializeApp,
      getApps,
      cert,
    } = require('firebase-admin/app');

    const {
      getFirestore,
    } = require('firebase-admin/firestore');

    // Convert literal \n into actual newlines.
    let privateKey = rawPrivateKey
      .replace(/\\n/g, '\n')
      .trim();

    // Remove accidental surrounding quotes.
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }

    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });

    const db = getFirestore(app);
// AUTH DIAGNOSTIC
try {
  console.log('🔐 Testing Firebase authentication...');

  const testSnap = await db.collection('channels').limit(1).get();

  console.log('✅ FIREBASE AUTH SUCCESS');
  console.log('📡 Channels accessible:', testSnap.size);
} catch (authError) {
  console.error('❌ FIREBASE AUTH FAILED');
  console.error('Error code:', authError.code);
  console.error('Error message:', authError.message);

  return {
    statusCode: 500,
    body: JSON.stringify({
      success: false,
      stage: 'firebase_authentication',
      error: authError.message,
      code: authError.code || null
    })
  };
}

    // Actually contact Firestore.
    const testSnap = await db
      .collection('__arena_diagnostic__')
      .limit(1)
      .get();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stage: 'firestore_authentication',
        message: 'Firebase Admin authenticated successfully.',
        firestoreConnection: true,
        documentsFound: testSnap.size,
        diagnostic,
      }),
    };

  } catch (error) {
    console.error('🔥 Firebase diagnostic error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        stage: 'firebase_authentication',
        error: error.message,
        diagnostic,
      }),
    };
  }
};