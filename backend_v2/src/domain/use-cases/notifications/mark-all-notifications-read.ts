export abstract class MarkAllNotificationsRead {
  abstract execute(gymId: string): Promise<void>;
}
