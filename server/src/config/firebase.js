/**
 * Server-side Firebase Configuration
 * Used for Firestore operations on the backend
 *
 * NOTE: Currently using Firebase Web SDK which has limitations on the server.
 * For production, consider migrating to Firebase Admin SDK for better reliability:
 *
 * import admin from 'firebase-admin';
 * admin.initializeApp({
 *   credential: admin.credential.cert(serviceAccount)
 * });
 * const db = admin.firestore();
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
