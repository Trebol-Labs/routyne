export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  addedAt: number;
}

export const subscriptions = new Map<string, StoredSubscription>();
