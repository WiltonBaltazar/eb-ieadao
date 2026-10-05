export interface CountryDialCode {
  iso2: string;
  name: string;
  dial: string;
}

// Mozambique first (default), then Lusophone/SADC countries, then other
// common destinations for the diaspora, alphabetically.
export const COUNTRIES: CountryDialCode[] = [
  { iso2: 'MZ', name: 'Moçambique', dial: '+258' },
  { iso2: 'AO', name: 'Angola', dial: '+244' },
  { iso2: 'PT', name: 'Portugal', dial: '+351' },
  { iso2: 'BR', name: 'Brasil', dial: '+55' },
  { iso2: 'CV', name: 'Cabo Verde', dial: '+238' },
  { iso2: 'GW', name: 'Guiné-Bissau', dial: '+245' },
  { iso2: 'ST', name: 'São Tomé e Príncipe', dial: '+239' },
  { iso2: 'TL', name: 'Timor-Leste', dial: '+670' },
  { iso2: 'ZA', name: 'África do Sul', dial: '+27' },
  { iso2: 'SZ', name: 'Essuatíni', dial: '+268' },
  { iso2: 'MW', name: 'Malawi', dial: '+265' },
  { iso2: 'ZW', name: 'Zimbabwe', dial: '+263' },
  { iso2: 'ZM', name: 'Zâmbia', dial: '+260' },
  { iso2: 'TZ', name: 'Tanzânia', dial: '+255' },
  { iso2: 'BW', name: 'Botswana', dial: '+267' },
  { iso2: 'NA', name: 'Namíbia', dial: '+264' },
  { iso2: 'LS', name: 'Lesoto', dial: '+266' },
  { iso2: 'KE', name: 'Quénia', dial: '+254' },
  { iso2: 'NG', name: 'Nigéria', dial: '+234' },
  { iso2: 'GH', name: 'Gana', dial: '+233' },
  { iso2: 'UG', name: 'Uganda', dial: '+256' },
  { iso2: 'ET', name: 'Etiópia', dial: '+251' },
  { iso2: 'EG', name: 'Egito', dial: '+20' },
  { iso2: 'MA', name: 'Marrocos', dial: '+212' },
  { iso2: 'CD', name: 'R.D. Congo', dial: '+243' },
  { iso2: 'RW', name: 'Ruanda', dial: '+250' },
  { iso2: 'US', name: 'Estados Unidos', dial: '+1' },
  { iso2: 'CA', name: 'Canadá', dial: '+1' },
  { iso2: 'GB', name: 'Reino Unido', dial: '+44' },
  { iso2: 'FR', name: 'França', dial: '+33' },
  { iso2: 'ES', name: 'Espanha', dial: '+34' },
  { iso2: 'DE', name: 'Alemanha', dial: '+49' },
  { iso2: 'IT', name: 'Itália', dial: '+39' },
  { iso2: 'NL', name: 'Países Baixos', dial: '+31' },
  { iso2: 'BE', name: 'Bélgica', dial: '+32' },
  { iso2: 'CH', name: 'Suíça', dial: '+41' },
  { iso2: 'SE', name: 'Suécia', dial: '+46' },
  { iso2: 'NO', name: 'Noruega', dial: '+47' },
  { iso2: 'DK', name: 'Dinamarca', dial: '+45' },
  { iso2: 'IE', name: 'Irlanda', dial: '+353' },
  { iso2: 'AU', name: 'Austrália', dial: '+61' },
  { iso2: 'CN', name: 'China', dial: '+86' },
  { iso2: 'IN', name: 'Índia', dial: '+91' },
  { iso2: 'AE', name: 'Emirados Árabes Unidos', dial: '+971' },
  { iso2: 'SA', name: 'Arábia Saudita', dial: '+966' },
  { iso2: 'QA', name: 'Catar', dial: '+974' },
  { iso2: 'JP', name: 'Japão', dial: '+81' },
  { iso2: 'KR', name: 'Coreia do Sul', dial: '+82' },
  { iso2: 'RU', name: 'Rússia', dial: '+7' },
  { iso2: 'TR', name: 'Turquia', dial: '+90' },
  { iso2: 'PL', name: 'Polónia', dial: '+48' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Splits a stored phone (e.g. "+258841234567") into its dial code and local
 * number, matching against the known list of dial codes. Falls back to the
 * default country when no prefix matches (e.g. legacy numbers with no "+").
 */
export function splitPhone(phone: string): { dial: string; number: string } {
  const trimmed = (phone ?? '').trim();

  if (trimmed.startsWith('+')) {
    const match = [...COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => trimmed.startsWith(c.dial));

    if (match) {
      return { dial: match.dial, number: trimmed.slice(match.dial.length) };
    }
  }

  return { dial: DEFAULT_COUNTRY.dial, number: trimmed.replace(/^\+/, '') };
}
