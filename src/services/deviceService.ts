import { admin, db } from "../firebase";
import { logger } from "../utils/logger";

/**
 * Возвращает uid владельца по deviceId.
 * Ищет сначала в deviceIndex/{deviceId}, если нет — через collectionGroup.
 */
export async function resolveUidByDeviceId(deviceId: string): Promise<string | undefined> {
  try {
    const idxRef = db.collection("deviceIndex").doc(deviceId);
    const idxSnap = await idxRef.get();

    if (idxSnap.exists) {
      const data = idxSnap.data();
      return data?.uid || undefined;
    }

    // fallback — ищем через users/*/devices/* (дороже, но разово)
    const cgSnap = await db
      .collectionGroup("devices")
      .where("deviceId", "==", deviceId)
      .limit(1)
      .get();

    if (!cgSnap.empty) {
      const firstDoc = cgSnap.docs[0];            // path: users/{uid}/devices/{deviceId}
      const pathParts = firstDoc.ref.path.split("/"); // ["users", "{uid}", "devices", "{deviceId}"]
      const uid = pathParts[1];

      // сохраняем в индекс на будущее
      await db.collection("deviceIndex").doc(deviceId).set(
        {
          uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return uid;
    }

    return undefined;
  } catch (err: any) {
    logger.error("[deviceService] resolveUidByDeviceId error", { error: err?.message });
    return undefined;
  }
}

/**
 * Создаёт или обновляет устройство в users/{uid}/devices/{deviceId}
 * + обновляет deviceIndex/{deviceId} → uid
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
      firstSeen: now,
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
