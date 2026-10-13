import { prisma } from "@/lib/prisma";
import { isPushConfigured, webpush } from "@/lib/push";

// Creates the in-app notification row (always) and best-effort pushes it to
// every browser/device the user has subscribed on. A push failure never
// blocks the caller — the in-app notification already exists regardless, and
// a subscription that the browser has dropped (410/404) is cleaned up so we
// stop wasting a request on it next time.
export async function notifyUser(
  userId: string,
  { type, message, taskId }: { type: string; message: string; taskId?: string | null }
) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, taskId: taskId ?? null },
  });

  if (!isPushConfigured()) return notification;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return notification;

  const payload = JSON.stringify({
    title: "iLOTBET Task Tracker",
    body: message,
    url: taskId ? `/tasks/${taskId}` : "/",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );

  return notification;
}
