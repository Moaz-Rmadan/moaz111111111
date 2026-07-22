import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Enable long polling and persistent local cache for mobile data (3G/4G/5G) compatibility and instant loading
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Firestore persistent local cache initialization failed. Falling back to long-polling Firestore:", error);
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.warn("Firestore initializeFirestore failed, falling back to getFirestore:", err);
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const getGoogleProvider = () => new GoogleAuthProvider();
