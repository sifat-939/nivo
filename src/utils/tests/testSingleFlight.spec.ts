/* eslint-disable @typescript-eslint/no-misused-promises */
import test from 'tape';
import { runSingleFlight } from '../singleFlight';

test('initialization calls share a pending run and reactivation can refresh', async (t) => {
  const state: { promise: Promise<number> | null } = { promise: null };
  let runs = 0;
  let finishRun: ((value: number) => void) | undefined;
  const initialize = () => {
    runs++;
    return new Promise<number>((resolve) => {
      finishRun = resolve;
    });
  };

  const mounted = runSingleFlight(state, initialize);
  const activated = runSingleFlight(state, initialize);
  t.equal(runs, 1, 'mount and activation start one initialization');
  t.equal(mounted, activated, 'both lifecycle hooks await the same run');

  finishRun!(1);
  t.equal(await mounted, 1, 'initialization completes');

  const reactivated = runSingleFlight(state, initialize);
  t.equal(runs, 2, 'a later activation starts a fresh initialization');
  finishRun!(2);
  t.equal(await reactivated, 2, 'reactivation refresh completes');
  t.end();
});
