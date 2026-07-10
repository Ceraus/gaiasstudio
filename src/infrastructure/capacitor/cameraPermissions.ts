import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export async function ensureProjectPhotoPermissions() {
  if (!Capacitor.isNativePlatform()) return { camera: "granted", photos: "granted" } as const;

  const current = await Camera.checkPermissions();
  if (current.camera === "granted" && current.photos === "granted") return current;

  return Camera.requestPermissions({ permissions: ["camera", "photos"] });
}
