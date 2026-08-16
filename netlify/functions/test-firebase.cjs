'use strict';
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

exports.handler = async function() {
  try {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    console.log('Project:', process.env.FIREBASE_PROJECT_ID);
    console.log('Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Key starts:', privateKey.slice(0, 50));

    const app = getApps().length ? getApps()[0] : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

    const db = getFirestore(app);
    const snap = await db.collection('channels').limit(1).get();
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        channelsFound: snap.size,
        message: 'Firebase auth working!'
      }) 
    };
  } catch(e) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: e.message,
        code: e.code 
      }) 
    };
  }
};
