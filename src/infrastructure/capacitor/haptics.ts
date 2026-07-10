import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

async function runNativeHaptic(action: () => Promise<void>) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await action();
  } catch {
    // Haptics are progressive enhancement; never block app interaction.
  }
}

export function hapticImpact(style: ImpactStyle = ImpactStyle.Light) {
  void runNativeHaptic(() => Haptics.impact({ style }));
}

export function hapticSelection() {
  void runNativeHaptic(() => Haptics.selectionChanged());
}

export function hapticSuccess() {
  void runNativeHaptic(() => Haptics.notification({ type: NotificationType.Success }));
}

export { ImpactStyle };
