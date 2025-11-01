import admin from "firebase-admin";

// Инициализация Firebase Admin (один раз для всего сервера)
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
export const db = admin.firestore();
