// src/firebase/index.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in environment variables");
  }

  const serviceAccount = JSON.parse(serviceAccountRaw);

  // Восстанавливаем переносы строки в ключе
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    // 👇👇👇 ВОТ ЭТО ПОЧИНИЛО Firestore Ошибку 👇👇👇
    ignoreUndefinedProperties: true
  });
}

export { admin };
export const db = admin.firestore();
