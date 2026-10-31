/**
 * Distinctive marketplace covers for listings that still use the shared brand mark
 * (`/assets/brand/cover-ai.svg`) or have no image. Real photos are left untouched.
 */

const THEMES: Record<string, { from: string; to: string; accent: string; icon: string }> = {
  'text-to-text': { from: '#16130f', to: '#3a2c18', accent: '#e6c98a', icon: 'chat' },
  'text-to-image': { from: '#1a130f', to: '#4a2c16', accent: '#f0b27a', icon: 'image' },
  'image-to-image': { from: '#161018', to: '#3d2444', accent: '#e4b8e0', icon: 'image' },
  'text-to-video': { from: '#10141c', to: '#1c3358', accent: '#9ec5f5', icon: 'film' },
  'image-to-video': { from: '#10161a', to: '#163e48', accent: '#8fd0d8', icon: 'film' },
  'voice-clone': { from: '#161210', to: '#3d2820', accent: '#f0c09a', icon: 'wave' },
  'voice-preset': { from: '#141016', to: '#3a2848', accent: '#d4b4f0', icon: 'wave' },
  'ai-film-series': { from: '#160e12', to: '#4a2030', accent: '#f0a0b4', icon: 'play' },
  'story-book': { from: '#15130e', to: '#3a3218', accent: '#e8d48a', icon: 'book' },
  'skill-pack': { from: '#101612', to: '#1c3a28', accent: '#a8d8b0', icon: 'puzzle' },
  'dataset': { from: '#101216', to: '#243044', accent: '#a8c4e8', icon: 'table' },
  inference: { from: '#14110c', to: '#3a3018', accent: '#e6c56a', icon: 'bolt' },
  'api-endpoint': { from: '#14110c', to: '#3a3018', accent: '#e6c56a', icon: 'bolt' },
  'gpu-compute': { from: '#101412', to: '#1a3328', accent: '#7dcea0', icon: 'chip' },
  'game-server': { from: '#0e1610', to: '#1a4a28', accent: '#8fd48a', icon: 'game' },
  'training-service': { from: '#14110e', to: '#3a2814', accent: '#e0b060', icon: 'sliders' },
  'fine-tune': { from: '#121014', to: '#32243c', accent: '#d4b0e0', icon: 'sliders' },
  'agent-runtime': { from: '#101214', to: '#203038', accent: '#9fd0d4', icon: 'bot' },
  'hire-agent': { from: '#101214', to: '#203038', accent: '#9fd0d4', icon: 'bot' },
  'hire-marketing': { from: '#16100e', to: '#4a2818', accent: '#f0b090', icon: 'megaphone' },
  'hire-seo': { from: '#101410', to: '#1e3828', accent: '#a0d8b0', icon: 'search' },
  'hire-creator': { from: '#161012', to: '#402030', accent: '#f0a8c8', icon: 'pen' },
  'hire-workflow': { from: '#101216', to: '#1e3048', accent: '#90c0f0', icon: 'flow' },
  'hire-build-web': { from: '#101214', to: '#243040', accent: '#a8c8e8', icon: 'layout' },
  'hire-build-app': { from: '#121016', to: '#302848', accent: '#c0b0f0', icon: 'phone' },
  'template-web': { from: '#101214', to: '#203040', accent: '#b0c8e0', icon: 'layout' },
  'template-app': { from: '#121016', to: '#302040', accent: '#e0b0d0', icon: 'phone' },
};

const FALLBACK_THEME = { from: '#14120e', to: '#2e2818', accent: '#c9a961', icon: 'bolt' };

export function isGenericCover(url?: string | null): boolean {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const path = raw.split('?')[0].split('#')[0].toLowerCase();
  return path.endsWith('cover-ai.svg') || path.includes('/brand/cover-ai');
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapName(name: string, max = 28): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }
  if (lines.length < 2 && current) lines.push(current);
  const used = lines.reduce((n, line) => n + line.split(/\s+/).length, 0);
  if (words.length > used && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > max - 1 ? `${last.slice(0, max - 1).trimEnd()}…` : `${last}…`;
  } else if (lines[0] && lines[0].length > max) {
    lines[0] = `${lines[0].slice(0, max - 1)}…`;
  }
  return lines.slice(0, 2);
}

function iconMarkup(kind: string, accent: string): string {
  const s = `fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const paths: Record<string, string> = {
    chat: `<path ${s} d="M7 16.2 4.8 19V6.6A1.6 1.6 0 0 1 6.4 5h11.2A1.6 1.6 0 0 1 19.2 6.6v7.6a1.6 1.6 0 0 1-1.6 1.6H7z"/><path ${s} d="M8 9.5h8M8 12.5h5"/>`,
    image: `<rect ${s} x="4" y="5" width="16" height="14" rx="2"/><circle ${s} cx="9" cy="10" r="1.3"/><path ${s} d="m4.5 15.5 4.2-3.2 2.8 2.2 2.6-2.2 5.4 4.2"/>`,
    film: `<rect ${s} x="4" y="6" width="16" height="12" rx="2"/><path ${s} d="M8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4"/>`,
    wave: `<path ${s} d="M4 12h2l2-5 3 10 2-6 2 3h5"/>`,
    play: `<circle ${s} cx="12" cy="12" r="8"/><path ${s} d="m10 9 6 3-6 3z" fill="${accent}" stroke="none"/>`,
    book: `<path ${s} d="M5 5.5h5.2A2.8 2.8 0 0 1 13 8.3V19a2.4 2.4 0 0 0-2.2-1.5H5z"/><path ${s} d="M19 5.5h-5.2A2.8 2.8 0 0 0 11 8.3V19a2.4 2.4 0 0 1 2.2-1.5H19z"/>`,
    puzzle: `<path ${s} d="M8 4h3v2.2a1.6 1.6 0 1 0 0 3.2V12H8.2a1.6 1.6 0 1 1-3.2 0H4V8h1.8A1.6 1.6 0 1 0 5.8 4.8V4z"/><path ${s} d="M14 12h2.2a1.6 1.6 0 1 1 0 3.2H14V20h-3v-2.2a1.6 1.6 0 1 0-3.2 0V20H4v-5h2.2"/>`,
    table: `<rect ${s} x="4" y="5" width="16" height="14" rx="2"/><path ${s} d="M4 10h16M4 14.5h16M10 10v9"/>`,
    bolt: `<path ${s} d="M13 3 6 13h5l-1 8 8-11h-5l0-7z"/>`,
    chip: `<rect ${s} x="7" y="7" width="10" height="10" rx="2"/><path ${s} d="M9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4"/>`,
    game: `<rect ${s} x="3" y="8" width="18" height="9" rx="3"/><path ${s} d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>`,
    sliders: `<path ${s} d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle ${s} cx="16" cy="8" r="2"/><circle ${s} cx="8" cy="16" r="2"/>`,
    bot: `<rect ${s} x="5" y="8" width="14" height="10" rx="2"/><path ${s} d="M12 8V5M9 12h.01M15 12h.01M9 18v2M15 18v2"/>`,
    megaphone: `<path ${s} d="M5 10v4l9 3V7L5 10z"/><path ${s} d="M14 9.5a3 3 0 0 1 0 5M7 14.5v2.2A1.3 1.3 0 0 0 8.3 18H9"/>`,
    search: `<circle ${s} cx="11" cy="11" r="5.5"/><path ${s} d="m15.2 15.2 4 4"/>`,
    pen: `<path ${s} d="M14.5 5.5 18.5 9.5 8 20H4v-4z"/><path ${s} d="m13 7 4 4"/>`,
    flow: `<circle ${s} cx="6" cy="7" r="2"/><circle ${s} cx="18" cy="7" r="2"/><circle ${s} cx="12" cy="17" r="2"/><path ${s} d="M8 7h8M6.8 8.8 11 15.2M17.2 8.8 13 15.2"/>`,
    layout: `<rect ${s} x="4" y="4" width="16" height="16" rx="2"/><path ${s} d="M4 9h16M10 9v11"/>`,
    phone: `<rect ${s} x="8" y="3" width="8" height="18" rx="2"/><path ${s} d="M11 18h2"/>`,
  };
  return `<svg x="376" y="78" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths['bolt']}</svg>`;
}

export function categoryCoverDataUrl(input: { category: string; name: string; label: string }): string {
  const theme = THEMES[input.category] || FALLBACK_THEME;
  const id = hash(`${input.category}|${input.name}`).toString(36);
  const glowX = 160 + (hash(input.name || input.category) % 480);
  const glowY = 40 + (hash(input.label || input.category) % 180);
  const lines = wrapName(input.name || input.label || 'AI');
  const nameY = lines.length > 1 ? 268 : 292;
  const nameSvg = lines
    .map((line, i) => `<tspan x="400" dy="${i === 0 ? 0 : 40}">${xml(line)}</tspan>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.from}"/>
      <stop offset="1" stop-color="${theme.to}"/>
    </linearGradient>
    <radialGradient id="r${id}" cx="${glowX}" cy="${glowY}" r="280" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g${id})"/>
  <rect width="800" height="450" fill="url(#r${id})"/>
  <circle cx="400" cy="102" r="40" fill="none" stroke="${theme.accent}" stroke-opacity="0.9" stroke-width="1.5"/>
  <circle cx="400" cy="102" r="54" fill="none" stroke="${theme.accent}" stroke-opacity="0.28" stroke-width="1"/>
  ${iconMarkup(theme.icon, theme.accent)}
  <text x="400" y="188" text-anchor="middle" fill="${theme.accent}" font-family="Lato, Segoe UI, sans-serif" font-size="15" font-weight="700" letter-spacing="1.6">${xml((input.label || input.category || 'AI').toUpperCase())}</text>
  <text x="400" y="${nameY}" text-anchor="middle" fill="#f7f4ee" font-family="Lato, Segoe UI, sans-serif" font-size="30" font-weight="700">${nameSvg}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
