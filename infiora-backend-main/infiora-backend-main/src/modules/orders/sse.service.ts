import { Response } from 'express';

/**
 * Server-Sent Events manager for real-time order notifications.
 * No extra packages required - uses standard HTTP chunked responses.
 *
 * Admin dashboard connects to GET /v1/orders/hotels/:hotelId/events
 * Backend emits events whenever orders are created or updated.
 */

const adminClients = new Map<string, Set<Response>>();
const groupClients = new Map<string, Set<Response>>();

const initSSEResponse = (res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': heartbeat\n\n');
};

const writeToPool = (pool: Set<Response> | undefined, payload: string): void => {
  if (!pool || pool.size === 0) return;

  pool.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      pool.delete(res);
    }
  });
};

export const addAdminSSEClient = (hotelId: string, res: Response): void => {
  initSSEResponse(res);
  if (!adminClients.has(hotelId)) adminClients.set(hotelId, new Set());
  adminClients.get(hotelId)!.add(res);
  res.on('close', () => removeAdminSSEClient(hotelId, res));
};

export const removeAdminSSEClient = (hotelId: string, res: Response): void => {
  const pool = adminClients.get(hotelId);
  if (!pool) return;
  pool.delete(res);
  if (pool.size === 0) adminClients.delete(hotelId);
};

export const sendAdminSSEEvent = (hotelId: string, event: string, data: unknown): void => {
  writeToPool(adminClients.get(hotelId), `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const pingAdminClients = (hotelId: string): void => {
  writeToPool(adminClients.get(hotelId), ': ping\n\n');
};

export const addGroupSSEClient = (groupId: string, res: Response): void => {
  initSSEResponse(res);
  if (!groupClients.has(groupId)) groupClients.set(groupId, new Set());
  groupClients.get(groupId)!.add(res);
  res.on('close', () => removeGroupSSEClient(groupId, res));
};

export const removeGroupSSEClient = (groupId: string, res: Response): void => {
  const pool = groupClients.get(groupId);
  if (!pool) return;
  pool.delete(res);
  if (pool.size === 0) groupClients.delete(groupId);
};

export const sendGroupSSEEvent = (groupId: string, event: string, data: unknown): void => {
  writeToPool(groupClients.get(groupId), `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const pingGroupClients = (groupId: string): void => {
  writeToPool(groupClients.get(groupId), ': ping\n\n');
};

export const sendSSEEventToAll = (hotelId: string, groupId: string | null, event: string, data: unknown): void => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  writeToPool(adminClients.get(hotelId), payload);
  if (groupId) writeToPool(groupClients.get(groupId), payload);
};

// Legacy aliases kept so existing admin SSE callers continue to work.
export const addSSEClient = addAdminSSEClient;
export const removeSSEClient = removeAdminSSEClient;
export const sendSSEEvent = sendAdminSSEEvent;
export const pingSSEClients = pingAdminClients;

export const getSSEClientCount = (): number => {
  let count = 0;
  adminClients.forEach((pool) => {
    count += pool.size;
  });
  groupClients.forEach((pool) => {
    count += pool.size;
  });
  return count;
};
