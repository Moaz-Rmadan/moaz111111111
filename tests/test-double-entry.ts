
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";

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

// Replicated Logic to test
async function createJournalEntry(lines: { debit?: number; credit?: number }[]) {
    // 1. Validate Double Entry
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`القيد غير متوازن: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit})`);
    }
    
    // Simulate DB save
    return true;
}

async function runTest() {
    console.log("TEST-ACC-01: Testing double entry balance...");
    const lines = [{ debit: 1000, credit: 900 }];
    try {
        await createJournalEntry(lines);
        console.error("Test failed: Should have thrown an error but didn't.");
    } catch (e: any) {
        console.log("Test passed: Caught expected error:", e.message);
    }
}

runTest();
