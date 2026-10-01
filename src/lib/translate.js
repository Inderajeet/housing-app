const TAMIL_RANGE = /[஀-௿]/;

// Free, no-API-key Google Translate endpoint
export async function translateText(text) {
  const input = (text || '').trim();
  if (!input) return { detected: null, target: null, translated: '' };

  const detected = TAMIL_RANGE.test(input) ? 'ta' : 'en';
  const target = detected === 'ta' ? 'en' : 'ta';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detected}&tl=${target}&dt=t&q=${encodeURIComponent(input)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation request failed: ${res.status}`);
  const data = await res.json();
  const translated = (data?.[0] || []).map((chunk) => chunk[0]).join('');

  return { detected, target, translated };
}

// Picks whichever of original/translated matches the given site locale, falling back to whichever exists
export function pickLocalized(original, translated, locale) {
  const values = [original, translated].filter(Boolean);
  if (!values.length) return '';
  if (locale === 'ta') return values.find((v) => TAMIL_RANGE.test(v)) || values[0];
  if (locale === 'en') return values.find((v) => !TAMIL_RANGE.test(v)) || values[0];
  return values[0];
}
