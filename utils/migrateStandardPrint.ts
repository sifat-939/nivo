import type { Fyo } from 'fyo';
import { STANDARD_PRINT_NAME, STANDARD_PRINT_TYPE } from './standardPrint';

/** Called at company initialization, before documents can be posted. */
export async function migrateStandardPrint(fyo: Fyo, template: string) {
  if (!template.trim())
    throw new Error('The standard print template is missing.');
  const old = await fyo.db.getAllRaw('PrintTemplate', {
    fields: ['name', 'template', 'type', 'width', 'height', 'isCustom'],
  });
  const current = old.find((t) => t.name === STANDARD_PRINT_NAME);
  const obsolete = old.filter((t) => t.name !== STANDARD_PRINT_NAME);
  const needsUpdate =
    !current ||
    current.template !== template ||
    current.type !== STANDARD_PRINT_TYPE ||
    current.width !== 21 ||
    current.height !== 29.7;
  if (!needsUpdate && !obsolete.length) return;
  const skip = fyo.store.skipTelemetryLogging;
  fyo.store.skipTelemetryLogging = true;
  try {
    await fyo.doc.runLifecycle(async () => {
      await fyo.db.beginTransaction();
      try {
        const doc = current
          ? await fyo.doc.getDoc('PrintTemplate', STANDARD_PRINT_NAME)
          : fyo.doc.getNewDoc('PrintTemplate', { name: STANDARD_PRINT_NAME });
        await doc.set({
          type: STANDARD_PRINT_TYPE,
          template,
          width: 21,
          height: 29.7,
          isCustom: false,
        });
        await doc.sync();
        const defaults = await fyo.doc.getDoc('Defaults');
        const updates: Record<string, string> = {};
        for (const field of defaults.schema.fields)
          if ('target' in field && field.target === 'PrintTemplate')
            updates[field.fieldname] = STANDARD_PRINT_NAME;
        await defaults.setAndSync(updates);
        if (fyo.schemaMap.POSProfile) {
          for (const row of await fyo.db.getAllRaw('POSProfile', {
            fields: ['name', 'posPrintTemplate'],
          })) {
            if (!row.posPrintTemplate) continue;
            const profile = await fyo.doc.getDoc(
              'POSProfile',
              String(row.name)
            );
            await profile.setAndSync('posPrintTemplate', STANDARD_PRINT_NAME);
          }
        }
        for (const row of obsolete)
          await fyo.db.delete('PrintTemplate', String(row.name));
        await fyo.db.commitTransaction();
        for (const row of obsolete)
          fyo.doc.removeFromCache('PrintTemplate', String(row.name));
      } catch (error) {
        await fyo.db.rollbackTransaction();
        throw error;
      }
    });
  } finally {
    fyo.store.skipTelemetryLogging = skip;
  }
}
