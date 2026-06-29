const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config();

try {
  let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      serviceAccount = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  }

  if (serviceAccount) {
      const parsed = JSON.parse(serviceAccount);
      admin.initializeApp({
          credential: admin.credential.cert(parsed)
      });

      const uid = 'qnnu43OyyQQSVjMVUM8Hn9HMjd53';
      admin.firestore().collection('users').doc(uid).collection('settings').doc('premium').get()
          .then(doc => {
              if (doc.exists) {
                  console.log('CURRENT PREMIUM DATA:', JSON.stringify(doc.data(), null, 2));
              } else {
                  console.log('NO PREMIUM DATA FOUND');
              }
              process.exit(0);
          })
          .catch(err => {
              console.error('Firestore error:', err);
              process.exit(1);
          });
  } else {
      console.error('No service account found in env');
      process.exit(1);
  }
} catch (e) {
  console.error('Error:', e);
  process.exit(1);
}
