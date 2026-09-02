import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type { CreateHealthVisitLogRequest } from "@daya/shared";
import { createHealthVisitLog } from "../api/visits";

const DRAFT_PREFIX = "daya.visitDraft.";
const QUEUE_KEY = "daya.visitQueue";

export interface QueuedVisit {
  id: string;
  payload: CreateHealthVisitLogRequest;
  queued_at: string;
  attempts: number;
  last_error?: string;
}

export async function saveVisitDraft(customerId: string, draft: CreateHealthVisitLogRequest) {
  await AsyncStorage.setItem(`${DRAFT_PREFIX}${customerId}`, JSON.stringify(draft));
}

export async function loadVisitDraft(customerId: string): Promise<CreateHealthVisitLogRequest | null> {
  const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${customerId}`);
  return raw ? (JSON.parse(raw) as CreateHealthVisitLogRequest) : null;
}

export async function clearVisitDraft(customerId: string) {
  await AsyncStorage.removeItem(`${DRAFT_PREFIX}${customerId}`);
}

async function readQueue(): Promise<QueuedVisit[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedVisit[]) : [];
}

async function writeQueue(queue: QueuedVisit[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueVisit(payload: CreateHealthVisitLogRequest): Promise<QueuedVisit> {
  const item: QueuedVisit = {
    id: payload.log_id ?? `offline-${Date.now()}`,
    payload,
    queued_at: new Date().toISOString(),
    attempts: 0,
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function flushVisitQueue(): Promise<{ synced: number; remaining: number }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const queue = await readQueue();
    return { synced: 0, remaining: queue.length };
  }

  const queue = await readQueue();
  const remaining: QueuedVisit[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await createHealthVisitLog(item.payload);
      synced += 1;
      if (item.payload.customer_id) {
        await clearVisitDraft(item.payload.customer_id);
      }
    } catch (error) {
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
        last_error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  await writeQueue(remaining);
  return { synced, remaining: remaining.length };
}

export function subscribeToReconnect(onOnline: () => void) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) onOnline();
  });
}
