// Sends ONE file to Supabase Storage with real progress, cancel and a stall timeout.
//
// Why XMLHttpRequest: it is the only built-in API in React Native that reports upload progress,
// and on a device `xhr.send({ uri })` streams the file from disk instead of loading a 200 MB
// video into memory. Supabase Storage accepts a raw binary body: the request is
//   POST {url}/storage/v1/object/{bucket}/{path}   (Authorization: Bearer <user's access token>)
// The user's own token is used, so Storage's row-level-security policies decide whether the write
// is allowed. No privileged key is involved.
//
// NOT VERIFIED on a real device or a real project (this was built and tested against a simulated
// XHR). See docs/MEDIA_SETUP.md, "What is not verified".
//
// putFile() returns { promise, cancel }. The promise NEVER rejects. It resolves to
//   { ok: true, status }                                   success
//   { ok: false, kind, status?, message?, retryable }      kind: network | timeout | http | cancelled | config

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isLocalFile(uri) {
  return /^(file|content|ph|assets-library):/i.test(String(uri || ''));
}

// What to hand to xhr.send(): a native file reference on devices, a Blob on the web.
export async function bodyForFile(file, platformOS, fetchImpl) {
  if (platformOS !== 'web' && isLocalFile(file.uri)) return { uri: file.uri, type: file.mimeType, name: file.name || 'file' };
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('fetch unavailable');
  const res = await doFetch(file.uri);
  return res.blob();
}

export function putFile({ url, headers, file, onProgress, stallTimeoutMs = 45000, xhrFactory, platformOS, fetchImpl }) {
  let xhr = null;
  let cancelled = false;
  let stallTimer = null;
  let finish = () => {};
  const promise = new Promise((resolve) => {
    let settled = false;
    finish = (result) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearTimeout(stallTimer);
      resolve(result);
    };
  });

  const arm = () => {
    if (stallTimer) clearTimeout(stallTimer);
    if (!stallTimeoutMs) return;
    stallTimer = setTimeout(() => {
      finish({ ok: false, kind: 'timeout', retryable: true, message: 'The upload stalled.' });
      if (xhr) xhr.abort(); // after finish(), so the abort handler can't report it as a plain network error
    }, stallTimeoutMs);
  };

  (async () => {
    let os = platformOS;
    if (!os) {
      try {
        // eslint-disable-next-line global-require
        os = require('react-native').Platform.OS;
      } catch (e) {
        os = 'web';
      }
    }
    let body;
    try {
      body = await bodyForFile(file, os, fetchImpl);
    } catch (e) {
      finish({ ok: false, kind: 'config', retryable: false, message: 'Couldn’t read the file. It may have been moved or deleted.' });
      return;
    }
    if (cancelled) return finish({ ok: false, kind: 'cancelled', retryable: false });
    const make = xhrFactory || (() => new XMLHttpRequest());
    xhr = make();
    xhr.open('POST', url, true);
    Object.keys(headers || {}).forEach((k) => xhr.setRequestHeader(k, headers[k]));
    xhr.setRequestHeader('Content-Type', file.mimeType);
    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        arm();
        if (onProgress && e && e.lengthComputable && e.total > 0) onProgress(Math.max(0, Math.min(1, e.loaded / e.total)));
      };
    }
    xhr.onload = () => {
      const status = xhr.status;
      if (status >= 200 && status < 300) return finish({ ok: true, status });
      let message = '';
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        message = String(parsed.message || parsed.error || '');
      } catch (e) {
        message = '';
      }
      finish({ ok: false, kind: 'http', status, message, retryable: RETRYABLE_STATUS.has(status) });
    };
    xhr.onerror = () => finish({ ok: false, kind: 'network', retryable: true, message: 'Network error.' });
    xhr.ontimeout = () => finish({ ok: false, kind: 'timeout', retryable: true, message: 'Timed out.' });
    xhr.onabort = () => finish(cancelled ? { ok: false, kind: 'cancelled', retryable: false } : { ok: false, kind: 'network', retryable: true, message: 'Aborted.' });
    arm();
    try {
      xhr.send(body);
    } catch (e) {
      finish({ ok: false, kind: 'network', retryable: true, message: 'Couldn’t start the upload.' });
    }
  })();

  return {
    promise,
    cancel() {
      cancelled = true;
      if (xhr) xhr.abort();
      finish({ ok: false, kind: 'cancelled', retryable: false });
    },
  };
}
