import admin from "firebase-admin";
import { cfg } from "./config.js";
import { logger } from "./logger.js";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: cfg.FIREBASE_PROJECT_ID,
      clientEmail: cfg.FIREBASE_CLIENT_EMAIL,
      privateKey: cfg.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
  logger.info("Firebase Admin initialized");
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
