

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}


export { admin };
export const db = admin.firestore();


