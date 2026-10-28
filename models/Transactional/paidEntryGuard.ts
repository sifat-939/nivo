import type { Fyo } from 'fyo';

const queues = new WeakMap<Fyo, Promise<void>>();

/** Finish a posting before accepting another submit/cancel from these forms. */
export async function runPaidEntryAction(
  fyo: Fyo,
  action: () => Promise<void>
) {
  const pending = queues.get(fyo) ?? Promise.resolve();
  const current = pending.catch(() => undefined).then(action);
  queues.set(fyo, current);
  try {
    await current;
  } finally {
    if (queues.get(fyo) === current) queues.delete(fyo);
  }
}
