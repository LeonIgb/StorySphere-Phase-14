// Keeps a picked file after the app restarts.
//
// Pickers hand back a URI that may live in a cache the system can clear. On a device we copy the
// file into the app's document directory so a story still plays after it is saved, edited and
// reopened. expo-file-system is loaded defensively (its API moved between SDK versions); when it
// is missing, or on the web, the original URI is kept and the file is marked as not persisted.

let FS = null;
try {
  // eslint-disable-next-line global-require
  FS = require('expo-file-system/legacy');
} catch (e) {
  try {
    // eslint-disable-next-line global-require
    FS = require('expo-file-system');
  } catch (e2) {
    FS = null;
  }
}

const DIR = FS && FS.documentDirectory ? `${FS.documentDirectory}storysphere-media/` : null;
export const CAN_PERSIST = Boolean(FS && DIR && typeof FS.copyAsync === 'function' && typeof FS.makeDirectoryAsync === 'function');

const safeName = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);

// Returns { uri, persisted }. Never throws.
export async function persistFile(uri, name) {
  if (!CAN_PERSIST || !/^(file|content):/i.test(String(uri))) return { uri, persisted: false };
  if (String(uri).startsWith(DIR)) return { uri, persisted: true };
  try {
    await FS.makeDirectoryAsync(DIR, { intermediates: true });
    const target = `${DIR}${Date.now().toString(36)}-${safeName(name)}`;
    await FS.copyAsync({ from: uri, to: target });
    return { uri: target, persisted: true };
  } catch (e) {
    return { uri, persisted: false };
  }
}
