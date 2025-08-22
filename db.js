// firebaseInit.js (or db.js)

// const admin = require('firebase-admin');
import admin from 'firebase-admin'

// 1. Point to your downloaded service account key file
//    Replace './serviceAccountKey.json' with the actual path to your file.
// const serviceAccount = require('./privet_folder/project-1-firestore-firebase-adminsdk-fbsvc-fe4ae240fb.json');
import serviceAccount from './config/project-1-firestore-firebase-adminsdk-fbsvc-fe4ae240fb.json' with { type: 'json' };

// 2. Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // 3. Specify your Firebase Project ID (replace 'your-project-id' with 'project-1-firestore')
  projectId: 'project-1-firestore'
});

// 4. Get a reference to the Firestore database
const db = admin.firestore();

// 5. Export the 'db' object so you can use it in other parts of your application
export { admin, db }

console.log('Firebase Admin SDK initialized and connected to Firestore.');
