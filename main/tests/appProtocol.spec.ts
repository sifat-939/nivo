import test from 'tape';
import path from 'path';
import os from 'os';
import { resolveAppProtocolPath } from '../appProtocol';

test('packaged deep routes reload the Vue document while assets retain their path', (t) => {
  const root = path.join(os.tmpdir(), 'nivo-app-src');
  for (const route of [
    '/',
    '/settings?tab=Features',
    '/list/SalesInvoice',
    '/edit/Item/Gift%20Bag',
    '/report/ProfitAndLoss',
    '/bank-cash',
  ])
    t.equal(
      resolveAppProtocolPath(root, 'app://.' + route),
      path.join(root, 'index.html')
    );
  t.equal(
    resolveAppProtocolPath(root, 'app://assets/brand.png'),
    path.join(root, 'assets', 'brand.png')
  );
  t.equal(
    resolveAppProtocolPath(root, 'app://./index.html'),
    path.join(root, 'index.html')
  );
  for (const url of [
    'app://../secret',
    'app://./%2e%2e%2fsecret',
    'app://./%00',
    'app://./%ZZ',
    'https://example.test/',
  ])
    t.equal(
      resolveAppProtocolPath(root, url),
      undefined,
      'rejects malformed/out-of-root request'
    );
  t.end();
});
