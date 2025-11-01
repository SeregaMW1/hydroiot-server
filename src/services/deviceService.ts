import { admin, db } from "../firebase";
import { logger } from "../utils/logger";

/**
 * Индекс устройства → владельца (uid):
 * deviceIndex/{deviceId} : { uid: string, createdAt, updatedAt }
 * Чтобы быстро находить uid по deviceId
 */
export async function resolveUidByDeviceId(deviceId: string): Promise<string | null> {
  try {
    const idxRef = db.collection("deviceIndex").doc(deviceId);
    const snap = await idxRef.get();
    if (snap.exists) {
      const data = snap.data()!;
      return data.uid || null;
    }

    // fallback: попробуем найти владельца через collectionGroup (дороже)
    const cg = await db.collectionGroup("devices")
      .where("deviceId", "==", deviceId)
      .limit(1)
      .get();

    if (!cg.empty) {
      const doc = cg.docs[0]; // path: users/{uid}/devices/{deviceId}
      const uid = doc.ref.path.split("/")[1]; // users/{uid}/devices/{deviceId}
      // сохраним в индекс на будущее
      await db.collection("deviceIndex").doc(deviceId).set({
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return uid;
    }
    return null;
  } catch (e: any) {
    logger.error("[deviceService] resolveUidByDeviceId error", { err: e?.message });
    return null;
  }
}

/**
 * Обновляет/создаёт устройство в users/{uid}/devices/{deviceId}
 * и поддерживает deviceIndex/{deviceId} → { uid }
 */
export async function upsertDeviceForUid(
  uid: string,
  deviceId: string,
  patch: { fw?: string | undefined; lastSeen?: Date; lastRssi?: number | null }
) {
  const devRef = db.collection("users").doc(uid).collection("devices").doc(deviceId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await devRef.set({
    deviceId,
    uid,
    model: "HydroESP32",
    fw: patch.fw ?? admin.firestore.FieldValue.delete(),
    lastSeen: patch.lastSeen ? admin.firestore.Timestamp.fromDate(patch.lastSeen) : now,
    lastRssi: patch.lastRssi ?? admin.firestore.FieldValue.delete(),
    status: "online",
    updatedAt: now,
    firstSeen: now,
  }, { merge: true });

  // индекс владельца по deviceId
  await db.collection("deviceIndex").doc(deviceId).set({
    uid,
    updatedAt: now,
  }, { merge: true });
}
