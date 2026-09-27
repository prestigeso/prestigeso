const aliases: Record<string, string> = {
  'Dekoratif Obje ve Biblo': 'Masa Setleri',
  'Masa Süsleri': 'Masa Setleri',
  Tavla: 'Masa Setleri',
  'Satranç': 'Masa Setleri',
  'Tesbihler': 'Tespihler',
  'Küpe': 'Küpeler',
};

export function currentCategoryName(name: string) {
  return aliases[name] ?? name;
}
