import baseSlugify from 'slugify';

baseSlugify.extend({
  'Ї': 'yi',  'ї': 'yi',
  'Є': 'ye',  'є': 'ye',
  'І': 'i',   'і': 'i',
  'Ґ': 'g',   'ґ': 'g',
});

export const toSlug = (text) =>
  baseSlugify(text, { lower: true, strict: true, trim: true });