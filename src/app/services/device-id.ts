/** Stable random id for this browser, sent as X-Device-Id so "Thiết bị đã kết nối" can list/revoke it. */
const KEY = 'phai.deviceId';

export function deviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(KEY) || '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      id = 'web-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function deviceName(): string {
  if (typeof navigator === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua) ? 'macOS' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ' · ' + os : ''}`;
}
