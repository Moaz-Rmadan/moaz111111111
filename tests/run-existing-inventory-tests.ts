
import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { runInventoryMigrationTests } from "../src/modules/inventory/services/inventoryTestRunner";

// Initialize Emulator
const apps = getApps();
const app = apps.length === 0 ? initializeApp({
  apiKey: "fake",
  projectId: "demo-erp-isolated",
  authDomain: "demo-erp-isolated.firebaseapp.com",
  storageBucket: "demo-erp-isolated.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890"
}) : apps[0];
const auth = getAuth(app);
connectAuthEmulator(auth, "http://localhost:9099");
const db = getFirestore(app);
connectFirestoreEmulator(db, "localhost", 8080);

async function run() {
    console.log("Running Inventory Tests...");
    const results = await runInventoryMigrationTests();
    results.forEach(r => console.log(`${r.testName}: ${r.status} - ${r.message}`));
}

run();
