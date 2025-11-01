import { admin, db } from "../firebase/index.js"; // ✅ Обязательно .js при "type": "module"
import { logger } from "../utils/logger.js";

/**
 * Возвращает uid владельца по deviceId.
 * Сначала ищет в deviceIndex/{deviceId}, затем через collectionGroup.
 */
export async function resolveUidByDeviceId(
  deviceId: string
): Promise<string | undefined> {
  try {
    const idxSnap = await db.collection("deviceIndex").doc(deviceId).get();

    if (idxSnap.exists) {
      return idxSnap.data()?.uid ?? undefined;
    }

    // fallback через users/*/devices/*
    const cgSnap = await db
      .collectionGroup("devices")
      .where("deviceId", "==", deviceId)
      .limit(1)
      .get();

    if (!cgSnap.empty) {
      const docRef = cgSnap.docs[0];
      const uid = docRef.ref.path.split("/")[1]; // users/{uid}/devices/{deviceId}

      // ✅ Сохраняем связку deviceId → uid
      await db.collection("deviceIndex").doc(deviceId).set(
        {
          uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return uid;
    }

    return undefined;
  } catch (error: any) {
    logger.error("[deviceService] resolveUidByDeviceId error", {
      error: error?.message,
    });
    return undefined;
  }
}

/**
 * Создаёт или обновляет:
 *  - users/{uid}/devices/{deviceId}
 *  - deviceIndex/{deviceId}
 */
export async function upsertDeviceForUid(
  uid: string,
  deviceId: string,
  patch: {
    fw?: string;
    lastSeen?: Date;
    lastRssi?: number | null;
  }
) {
  const deviceRef = db.collection("users").doc(uid).collection("devices").doc(deviceId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await deviceRef.set(
    {
      deviceId,
      uid,
      model: "HydroESP32",

      fw: patch.fw ?? admin.firestore.FieldValue.delete(),
      lastSeen: patch.lastSeen
        ? admin.firestore.Timestamp.fromDate(patch.lastSeen)
        : now,
      lastRssi: patch.lastRssi ?? admin.firestore.FieldValue.delete(),

      status: "online",
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("deviceIndex").doc(deviceId).set(
    {
      uid,
      updatedAt: now,
    },
    { merge: true }
  );
}
