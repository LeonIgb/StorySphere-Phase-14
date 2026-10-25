// Local persistence for prototype data.
//
// Uses @react-native-async-storage/async-storage when this runtime has it. If the module is
// missing, or its native side is unavailable, everything falls back to memory for this session
// and getStorageMode() reports 'memory' so the UI can say that nothing is being kept.

let AsyncStorage = null;
try {
  // eslint-disable-next-line global-require
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorage = (mod && mod.default) || mod;
} catch (e) {
  AsyncStorage = null;
}

const memory = {};
let mode = AsyncStorage && typeof AsyncStorage.getItem === 'function' ? 'device' : 'memory';

export function getStorageMode() {
  return mode;
}

function fallBack(error) {
  mode = 'memory';
  console.warn('StorySphere storage unavailable, using memory only:', error && error.message);
}

// Resolves to the parsed value, or `fallback` when nothing is saved or it cannot be read.
export async function loadJSON(key, fallback = null) {
  if (mode === 'device') {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof SyntaxError) return fallback; // corrupt data: start clean
      fallBack(error);
    }
  }
  return Object.prototype.hasOwnProperty.call(memory, key) ? JSON.parse(memory[key]) : fallback;
}

// Resolves to true when the value was written to the device, false when it only lives in memory.
export async function saveJSON(key, value) {
  const raw = JSON.stringify(value);
  memory[key] = raw;
  if (mode !== 'device') return false;
  try {
    await AsyncStorage.setItem(key, raw);
    return true;
  } catch (error) {
    fallBack(error);
    return false;
  }
}

export async function removeKey(key) {
  delete memory[key];
  if (mode !== 'device') return;
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    fallBack(error);
  }
}
