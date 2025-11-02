import { db, admin } from "../firebase/index.js";
import { logger } from "../utils/logger.js";


export async function resolveUidByDeviceId(
  deviceId: string
): Promise<string | undefined> {
  try {
    const snap = await db.collection("deviceIndex").doc(deviceId).get();

    if (snap.exists) {
      const data = snap.data();
      return data?.uid || undefined;
    }

    // Если в индексе нет — просто возвращаем undefined
    // (значит устройство ещё не привязано к пользователю)
    return undefined;
  } catch (error: any) {
    logger.error("[deviceService] resolveUidByDeviceId error", {
      error: error?.message,
      deviceId,
    });
    return undefined;
  }
}

/**
 * ✅ Создаёт/обновляет:
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
  try {
    const deviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

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

    // ✅ deviceIndex/{deviceId} — чистая связь device → uid
    await db.collection("deviceIndex").doc(deviceId).set(
      {
        uid,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error: any) {
    logger.error("[deviceService] upsertDeviceForUid error", {
      error: error?.message,
      deviceId,
      uid,
    });
  }
}
