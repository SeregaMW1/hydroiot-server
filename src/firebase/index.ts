// src/firebase/index.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in environment variables");
  }

  const serviceAccount = JSON.parse(serviceAccountRaw);

  // Восстановление переносов ключа
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  // ❗ ВАЖНО: никаких ignoreUndefinedProperties
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export { admin };
export const db = admin.firestore();
