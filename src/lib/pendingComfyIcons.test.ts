/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, Ingredient } from '@/types';

const added: Array<{ id: string; ingredientId: string; name: string; createdAt: number }> = [];
const update = vi.fn();
const generate = vi.fn();
const heartbeat: {
  online: boolean;
  checking: boolean;
  status: { state: 'connected' | 'unreachable'; message: string };
} = {
  online: false,
  checking: false,
  status: { state: 'unreachable', message: 'down' },
};

vi.mock('@/db/db', () => ({
  db: {
    pendingComfyIcons: {
      where: () => ({ equals: () => ({ first: async () => added[0] }) }),
      add: async (job: (typeof added)[number]) => { added.push(job); },
      update: async () => {},
      delete: async () => {},
      orderBy: () => ({ toArray: async () => [...added] }),
    },
    ingredients: { get: async () => undefined },
  },
}));

vi.mock('@/db/repositories', () => ({
  ingredientsRepo: { update: (...args: unknown[]) => update(...args) },
  settingsRepo: { get: async () => ({ comfyUiEnabled: true }) },
}));

vi.mock('@/lib/comfyUiApi', () => ({
  generateIngredientIconResult: (...args: unknown[]) => generate(...args),
}));

vi.mock('@/lib/comfyUiHeartbeat', () => ({
  getComfyUiHeartbeat: () => heartbeat,
  subscribeComfyUiHeartbeat: () => () => {},
}));

vi.mock('@/lib/id', () => ({ uid: () => 'job-1' }));

const { requestCustomIngredientIcon } = await import('@/lib/pendingComfyIcons');

const settings = { comfyUiEnabled: true } as AppSettings;
const coconut = { id: 'ing-1', name: 'Coconut' } as Ingredient;

describe('requestCustomIngredientIcon', () => {
  beforeEach(() => {
    added.length = 0;
    update.mockReset();
    generate.mockReset();
    heartbeat.online = false;
    heartbeat.status = { state: 'unreachable', message: 'down' };
  });

  it('queues the job when ComfyUI is offline without blocking generate', async () => {
    const iconKey = await requestCustomIngredientIcon(coconut, settings);
    expect(iconKey).toBeNull();
    expect(generate).not.toHaveBeenCalled();
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      id: 'job-1',
      ingredientId: 'ing-1',
      name: 'Coconut',
    });
  });

  it('calls the existing Comfy generate pipeline when the host is reachable', async () => {
    heartbeat.online = true;
    heartbeat.status = { state: 'connected', message: 'ok' };
    generate.mockResolvedValue({ status: 'ok', iconKey: 'asset_abc' });

    const iconKey = await requestCustomIngredientIcon(coconut, settings);
    expect(generate).toHaveBeenCalledWith(settings, 'Coconut');
    expect(iconKey).toBe('asset_abc');
    expect(update).toHaveBeenCalledWith('ing-1', { iconKey: 'asset_abc' });
    expect(added).toHaveLength(0);
  });

  it('writes the queue when generate fails on the network', async () => {
    heartbeat.online = true;
    heartbeat.status = { state: 'connected', message: 'ok' };
    generate.mockResolvedValue({ status: 'network', error: new Error('Could not reach ComfyUI.') });

    const iconKey = await requestCustomIngredientIcon(coconut, settings);
    expect(iconKey).toBeNull();
    expect(added).toHaveLength(1);
    expect(added[0].ingredientId).toBe('ing-1');
  });
});
