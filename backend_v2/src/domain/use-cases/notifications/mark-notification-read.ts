export abstract class MarkNotificationRead {
  abstract execute(gymId: string, notificationId: string): Promise<void>;
}
