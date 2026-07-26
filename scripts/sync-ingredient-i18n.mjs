/**
 * Sync ingredientNames in en.json / es.json from ingredientSeed.ts catalog.
 * Run: node scripts/sync-ingredient-i18n.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(root, 'src/data/ingredientSeed.ts');
const enPath = path.join(root, 'src/i18n/en.json');
const esPath = path.join(root, 'src/i18n/es.json');

/** Must match UI: ing.name.toLowerCase().replace(/ /g, '_') */
function toKey(name) {
  return name.toLowerCase().replace(/ /g, '_');
}

function extractNames(source) {
  const names = [];
  const re = /name:\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    names.push(m[1].replace(/\\'/g, "'"));
  }
  return [...new Set(names)];
}

/** Common English → Spanish word/phrase map for soap & beauty ingredients. */
const LEX = {
  'Glycerin Base': 'Base de Glicerina',
  'Melt & Pour Base': 'Base de Fundir y Verter',
  'Goat Milk': 'Leche de Cabra',
  'Cocoa Butter': 'Manteca de Cacao',
  'Activated Charcoal': 'Carbón Activado',
  'Sweet Almond': 'Almendra Dulce',
  'Dead Sea Mud': 'Barro del Mar Muerto',
  'French Green Clay': 'Arcilla Verde Francesa',
  'Rose Kaolin Clay': 'Arcilla de Caolín Rosa',
  'White Kaolin Clay': 'Arcilla de Caolín Blanca',
  'Kaolin Clay': 'Arcilla de Caolín',
  'Bentonite Clay': 'Arcilla Bentonita',
  'Rhassoul Clay': 'Arcilla Rhassoul',
  'Australian Red Clay': 'Arcilla Roja Australiana',
  'Fuller\'s Earth': 'Tierra de Fuller',
  'Green Tea': 'Té Verde',
  'Black Seed': 'Semilla Negra',
  'Sea Buckthorn': 'Espino Amarillo',
  'Evening Primrose': 'Onagra',
  'Rose Hip': 'Rosa Mosqueta',
  'Rosehip': 'Rosa Mosqueta',
  'Hemp Seed': 'Semilla de Cáñamo',
  'Rice Bran': 'Salvado de Arroz',
  'Apricot Kernel': 'Hueso de Albaricoque',
  'Meadowfoam Seed': 'Semilla de Meadowfoam',
  'Pomegranate Seed': 'Semilla de Granada',
  'Fragrance Oil': 'Aceite de Fragancia',
  'Essential Oil': 'Aceite Esencial',
  'Vitamin E': 'Vitamina E',
  'Honey Powder': 'Polvo de Miel',
  'Goat Milk Powder': 'Polvo de Leche de Cabra',
  'Colloidal Oatmeal': 'Avena Coloidal',
  'Mica Powder': 'Polvo de Mica',
  'Iron Oxides': 'Óxidos de Hierro',
  'Ultramarine Blue': 'Azul Ultramar',
  'Sodium Hydroxide': 'Hidróxido de Sodio',
  'Potassium Hydroxide': 'Hidróxido de Potasio',
  'Sodium Cocoyl Isethionate': 'Isetionato de Cocilo Sódico',
  'Clear': 'Transparente',
  'White': 'Blanco',
  'Charcoal': 'Carbón',
  'Honey': 'Miel',
  'Oatmeal': 'Avena',
  'Shea': 'Karité',
  'Hemp': 'Cáñamo',
  'Aloe': 'Aloe',
  'Custom': 'Personalizado',
  'Coconut': 'Coco',
  'Olive': 'Oliva',
  'Castor': 'Ricino',
  'Jojoba': 'Jojoba',
  'Avocado': 'Aguacate',
  'Sunflower': 'Girasol',
  'Argan': 'Argán',
  'Grapeseed': 'Semilla de Uva',
  'Grape': 'Uva',
  'Babassu': 'Babassu',
  'Neem': 'Neem',
  'Tamanu': 'Tamanu',
  'Moringa': 'Moringa',
  'Marula': 'Marula',
  'Safflower': 'Cártamo',
  'Borage': 'Borraja',
  'Shea Butter': 'Manteca de Karité',
  'Cocoa Butter': 'Manteca de Cacao',
  'Mango Butter': 'Manteca de Mango',
  'Kokum Butter': 'Manteca de Kokum',
  'Murumuru Butter': 'Manteca de Murumuru',
  'Illipe Butter': 'Manteca de Illipe',
  'Cupuaçu Butter': 'Manteca de Cupuaçu',
  'Calendula': 'Caléndula',
  'Chamomile': 'Manzanilla',
  'Lavender': 'Lavanda',
  'Rosemary': 'Romero',
  'Aloe Vera': 'Aloe Vera',
  'Nettle': 'Ortiga',
  'Comfrey': 'Consuelda',
  'Plantain': 'Llantén',
  'St. John\'s Wort': 'Hierba de San Juan',
  'Dandelion': 'Diente de León',
  'Turmeric': 'Cúrcuma',
  'Rose Petals': 'Pétalos de Rosa',
  'Rose Petal': 'Pétalo de Rosa',
  'Jasmine': 'Jazmín',
  'Hibiscus': 'Hibisco',
  'Elder Flower': 'Flor de Saúco',
  'Ylang Ylang': 'Ylang-Ylang',
  'Peppermint': 'Menta Piperita',
  'Eucalyptus': 'Eucalipto',
  'Tea Tree': 'Árbol de Té',
  'Lemongrass': 'Hierba Limón',
  'Patchouli': 'Pachulí',
  'Vanilla': 'Vainilla',
  'Cinnamon': 'Canela',
  'Cedar': 'Cedro',
  'Bergamot': 'Bergamota',
  'Lemon': 'Limón',
  'Orange': 'Naranja',
  'Grapefruit': 'Toronja',
  'Lime': 'Lima',
  'Sandalwood': 'Sándalo',
  'Frankincense': 'Incienso',
  'Myrrh': 'Mirra',
  'Geranium': 'Geranio',
  'Clary Sage': 'Salvia Esclarea',
  'Palmarosa': 'Palmarosa',
  'Rose': 'Rosa',
  'Coffee': 'Café',
  'Oat': 'Avena',
  'Rice': 'Arroz',
  'Honeycomb': 'Panal de Miel',
  'Beeswax': 'Cera de Abeja',
  'Wax': 'Cera',
  'Powder': 'Polvo',
  'Extract': 'Extracto',
  'Oil': 'Aceite',
  'Butter': 'Manteca',
  'Clay': 'Arcilla',
  'Salt': 'Sal',
  'Milk': 'Leche',
  'Seeds': 'Semillas',
  'Seed': 'Semilla',
  'Herb': 'Hierba',
  'Root': 'Raíz',
  'Leaves': 'Hojas',
  'Leaf': 'Hoja',
  'Flowers': 'Flores',
  'Flower': 'Flor',
  'Berries': 'Bayas',
  'Pods': 'Vainas',
  'Sticks': 'Varillas',
  'Powder': 'Polvo',
  'Mica': 'Mica',
  'Mirage': 'Mirage',
  'Colorant': 'Colorante',
  'Glitter': 'Purpurina',
  'Complex': 'Complejo',
  'Peptide': 'Péptido',
  'Acid': 'Ácido',
  'Alcohol': 'Alcohol',
  'Beads': 'Perlas',
  'Bioferment': 'Biofermento',
  'Antique Gold': 'Oro Antiguo',
  'Champagne Gold': 'Oro Champán',
  'Gold': 'Oro',
  'Silver': 'Plata',
  'Bronze': 'Bronce',
  'Copper': 'Cobre',
  'Pearl': 'Perla',
  'Nude': 'Nude',
  'Teal': 'Verde Azulado',
  'Turquoise': 'Turquesa',
  'Sapphire': 'Zafiro',
  'Emerald': 'Esmeralda',
  'Ruby': 'Rubí',
  'Coral': 'Coral',
  'Brick Red': 'Rojo Ladrillo',
  'Cherry Red': 'Rojo Cereza',
  'Hot Pink': 'Rosa Intenso',
  'Sky Blue': 'Azul Cielo',
  'Ocean Blue': 'Azul Océano',
  'Navy Blue': 'Azul Marino',
  'Forest Green': 'Verde Bosque',
  'Grass Green': 'Verde Hierba',
  'Matcha Green': 'Verde Matcha',
  'Aqua Green': 'Verde Agua',
  'Bright Yellow': 'Amarillo Brillante',
  'Purple': 'Morado',
  'Pink': 'Rosa',
  'Red': 'Rojo',
  'Yellow': 'Amarillo',
  'Green': 'Verde',
  'Blue': 'Azul',
  'Black': 'Negro',
  'White': 'Blanco',
  'Walnut': 'Nuez',
  'Almond': 'Almendra',
  'Volcanic Ash': 'Ceniza Volcánica',
  'Irish Moss': 'Musgo Irlandés',
  'Slippery Elm': 'Olmo Resbaladizo',
  'St. John\'s Wort': 'Hierba de San Juan',
  'Yellow Dock': 'Acedera Amarilla',
  'Red Clover': 'Trébol Rojo',
  'Cat\'s Claw': 'Uña de Gato',
  'Pau D\'Arco': 'Pau D\'Arco',
  'Sea Kelp': 'Alga Marina',
  'Marine Collagen': 'Colágeno Marino',
  'Hyaluronic': 'Hialurónico',
  'Lactic': 'Láctico',
  'Salicylic': 'Salicílico',
  'Ferulic': 'Ferúlico',
  'Kojic': 'Kójico',
  'Mandelic': 'Mandélico',
  'Azelaic': 'Azelaico',
  'Phytic': 'Fítico',
  'Tranexamic': 'Tranexámico',
  'Stearic': 'Esteárico',
  'Fulvic': 'Fúlvico',
  'Tuberose': 'Tuberosa',
  'Tallow': 'Sebo',
  'Lard': 'Manteca de Cerdo',
  'Sugar': 'Azúcar',
  'Raw': 'Crudo',
  'Traditional': 'Tradicional',
  'Cosmetic': 'Cosmético',
  'Holographic': 'Holográfica',
  'Biodegradable': 'Biodegradable',
  'Ground': 'Molido',
  'Soap': 'Jabón',
  'Iron Oxide': 'Óxido de Hierro',
  'Chromium Oxide': 'Óxido de Cromo',
  'Titanium Dioxide': 'Dióxido de Titanio',
  'Ultramarine': 'Ultramar',
  'Manganese Violet': 'Violeta de Manganeso',
  'Plant Squalane': 'Escualano Vegetal',
  'Blue Tansy': 'Tanaceto Azul',
  'Echinacea': 'Equinácea',
  'Fenugreek': 'Fenogreco',
  'Chickweed': 'Verónica',
  'Horsetail': 'Cola de Caballo',
  'Mugwort': 'Artemisa',
  'Mullein': 'Gordolobo',
  'Motherwort': 'Agripalma',
  'Sarsaparilla': 'Sarsaparilla',
  'Bakuchiol': 'Bakuchiol',
  'Bisabolol': 'Bisabolol',
  'Betaine': 'Betaína',
  'Allantoin': 'Alantoína',
  'Lanolin': 'Lanolina',
  'Niacinamide': 'Niacinamida',
  'Resveratrol': 'Resveratrol',
  'Glutathione': 'Glutatión',
  'Idebenone': 'Idebenona',
  'CoQ10': 'CoQ10',
  'DMAE': 'DMAE',
  'AHA': 'AHA',
  'EGF': 'EGF',
  'MSM': 'MSM',
  'PCA': 'PCA',
  'EDTA': 'EDTA',
  'Tetrasodium': 'Tetrasódico',
};

/** Curated Spanish names — overrides auto-translation when quality matters. */
const MANUAL_OVERRIDES = {
  'AHA Complex': 'Complejo AHA',
  'Allantoin': 'Alantoína',
  'Aloe Vera': 'Aloe Vera',
  'Aloe Vera Juice': 'Jugo de Aloe Vera',
  'Alpha Lipoic Acid': 'Ácido Alfa Lipoico',
  'Amino Acids (Complex)': 'Aminoácidos (Complejo)',
  'Antique Gold Mica': 'Mica Oro Antiguo',
  'Aqua Green Colorant': 'Colorante Verde Agua',
  'Azelaic Acid': 'Ácido Azelaico',
  'Bakuchiol': 'Bakuchiol',
  'Beta-Glucan': 'Beta-Glucano',
  'Betaine': 'Betaína',
  'Biodegradable Glitter': 'Purpurina Biodegradable',
  'Bisabolol': 'Bisabolol',
  'Black Pearl Mica': 'Mica Perla Negra',
  'Black Soap Colorant': 'Colorante de Jabón Negro',
  'Black Walnut Hull': 'Cáscara de Nuez Negra',
  'Black-Purple Mirage Mica': 'Mica Mirage Negro-Morado',
  'Blue Tansy': 'Tanaceto Azul',
  'Blue-Purple Mirage Mica': 'Mica Mirage Azul-Morado',
  'Brick Red Mica': 'Mica Rojo Ladrillo',
  'Brick Red Soap Colorant': 'Colorante de Jabón Rojo Ladrillo',
  'Bright Yellow Mica': 'Mica Amarillo Brillante',
  'Bronze Mica': 'Mica Bronce',
  'Caffeine (Cosmetic)': 'Cafeína (Cosmética)',
  'Cat\'s Claw': 'Uña de Gato',
  'Ceramide Complex': 'Complejo de Ceramidas',
  'Cetyl Alcohol': 'Alcohol Cetílico',
  'Champagne Gold Mica': 'Mica Oro Champán',
  'Cherry Red Soap Colorant': 'Colorante de Jabón Rojo Cereza',
  'Chickweed': 'Verónica',
  'Cholesterol (Cosmetic)': 'Colesterol (Cosmético)',
  'Chromium Oxide Green': 'Verde Óxido de Cromo',
  'Copper Mica': 'Mica Cobre',
  'Copper Peptide': 'Péptido de Cobre',
  'CoQ10': 'CoQ10',
  'Coral Pink Mica': 'Mica Rosa Coral',
  'D-Panthenol (B5)': 'D-Pantenol (B5)',
  'DMAE': 'DMAE',
  'Echinacea': 'Equinácea',
  'EDTA (Tetrasodium)': 'EDTA (Tetrasódico)',
  'EGF (Cosmetic)': 'EGF (Cosmético)',
  'Emerald Green Mica': 'Mica Verde Esmeralda',
  'Fenugreek': 'Fenogreco',
  'Ferulic Acid': 'Ácido Ferúlico',
  'Forest Green Mica': 'Mica Verde Bosque',
  'Fulvic Acid': 'Ácido Fúlvico',
  'Germaben II': 'Germaben II',
  'Germall Plus': 'Germall Plus',
  'Gluconolactone': 'Gluconolactona',
  'Glutathione': 'Glutatión',
  'Gold Mica': 'Mica Oro',
  'Gold-Green Mirage Mica': 'Mica Mirage Oro-Verde',
  'Grass Green Soap Colorant': 'Colorante de Jabón Verde Hierba',
  'Green Colorant': 'Colorante Verde',
  'Green-Blue Mirage Mica': 'Mica Mirage Verde-Azul',
  'Ground Almond': 'Almendra Molida',
  'Holographic Glitter': 'Purpurina Holográfica',
  'Horsetail': 'Cola de Caballo',
  'Hot Pink Mica': 'Mica Rosa Intenso',
  'Hyaluronic Acid': 'Ácido Hialurónico',
  'Idebenone': 'Idebenona',
  'Irish Moss': 'Musgo Irlandés',
  'Iron Oxide Black': 'Óxido de Hierro Negro',
  'Iron Oxide Brown': 'Óxido de Hierro Marrón',
  'Iron Oxide Red': 'Óxido de Hierro Rojo',
  'Iron Oxide Yellow': 'Óxido de Hierro Amarillo',
  'Jojoba Beads': 'Perlas de Jojoba',
  'Kojic Acid': 'Ácido Kójico',
  'L-Ascorbic Acid': 'Ácido L-Ascórbico',
  'Lactic Acid': 'Ácido Láctico',
  'Lanolin': 'Lanolina',
  'Lard (Traditional)': 'Manteca de Cerdo (Tradicional)',
  'Leucidal Liquid': 'Leucidal Líquido',
  'Magnesium Ascorbyl Phosphate': 'Fosfato de Magnesio y Ascorbilo',
  'Mandelic Acid': 'Ácido Mandélico',
  'Manganese Violet': 'Violeta de Manganeso',
  'Marine Collagen': 'Colágeno Marino',
  'Matcha Green Soap Colorant': 'Colorante de Jabón Verde Matcha',
  'Matrixyl 3000': 'Matrixyl 3000',
  'Motherwort': 'Agripalma',
  'MSM (Cosmetic)': 'MSM (Cosmético)',
  'Mugwort': 'Artemisa',
  'Mullein': 'Gordolobo',
  'Myristyl Myristate': 'Miristil Miristato',
  'Naticide': 'Naticide',
  'Navy Blue Mica': 'Mica Azul Marino',
  'Navy Blue Soap Colorant': 'Colorante de Jabón Azul Marino',
  'Niacinamide': 'Niacinamida',
  'Nude Mica': 'Mica Nude',
  'Ocean Blue Mica': 'Mica Azul Océano',
  'Optiphen Plus': 'Optiphen Plus',
  'Ozokerite': 'Ozokerita',
  'Pau D\'Arco': 'Pau D\'Arco',
  'Peach Mica': 'Mica Durazno',
  'Peach Soap Colorant': 'Colorante de Jabón Durazno',
  'Pearl Mica': 'Mica Perla',
  'Pearl Pink Mica': 'Mica Rosa Perla',
  'Peptide Complex': 'Complejo de Péptidos',
  'Phenoxyethanol': 'Fenoxietanol',
  'Phytic Acid': 'Ácido Fítico',
  'Pink Colorant': 'Colorante Rosa',
  'Pink Soap Colorant': 'Colorante de Jabón Rosa',
  'Plant Squalane': 'Escualano Vegetal',
  'Polyglutamic Acid': 'Ácido Poliglutámico',
  'Potassium Sorbate': 'Sorbato de Potasio',
  'Purple Colorant': 'Colorante Morado',
  'Purple Mica': 'Mica Morada',
  'Purple Soap Colorant': 'Colorante de Jabón Morado',
  'Purple-Pink Mirage Mica': 'Mica Mirage Morado-Rosa',
  'Red Clover': 'Trébol Rojo',
  'Red Colorant': 'Colorante Rojo',
  'Red Soap Colorant': 'Colorante de Jabón Rojo',
  'Red-Orange Mirage Mica': 'Mica Mirage Rojo-Naranja',
  'Resveratrol': 'Resveratrol',
  'Retinol (Cosmetic)': 'Retinol (Cosmético)',
  'Rose Gold Mica': 'Mica Oro Rosa',
  'Rose Soap Colorant': 'Colorante de Jabón Rosa',
  'Ruby Red Mica': 'Mica Rojo Rubí',
  'Salicylic Acid': 'Ácido Salicílico',
  'Sandalwood Rose FO': 'Aceite de Fragancia Sándalo y Rosa',
  'Sapphire Blue Mica': 'Mica Azul Zafiro',
  'Sapphire Blue Soap Colorant': 'Colorante de Jabón Azul Zafiro',
  'Sarsaparilla': 'Sarsaparilla',
  'Sea Kelp Bioferment': 'Biofermento de Alga Marina',
  'Silver Mica': 'Mica Plata',
  'Sky Blue Mica': 'Mica Azul Cielo',
  'Sky Blue Soap Colorant': 'Colorante de Jabón Azul Cielo',
  'Slippery Elm': 'Olmo Resbaladizo',
  'Sodium Cocoyl Isethionate': 'Isetionato de Cocilo Sódico',
  'Sodium Hydroxypropyl Starch Phosphate': 'Fosfato de Almidón e Hidroxipropilo Sódico',
  'Sodium PCA': 'PCA Sódico',
  'Stearic Acid': 'Ácido Esteárico',
  'Stearyl Alcohol': 'Alcohol Estearílico',
  'Sugar (Raw)': 'Azúcar (Crudo)',
  'Tallow (Traditional)': 'Sebo (Tradicional)',
  'Teal Mica': 'Mica Verde Azulado',
  'Teal Soap Colorant': 'Colorante de Jabón Verde Azulado',
  'Titanium Dioxide': 'Dióxido de Titanio',
  'Tranexamic Acid': 'Ácido Tranexámico',
  'Tuberose FO': 'Aceite de Fragancia Tuberosa',
  'Tuberose Fragrance Oil': 'Aceite de Fragancia de Tuberosa',
  'Turquoise Mica': 'Mica Turquesa',
  'Ultramarine Green': 'Verde Ultramar',
  'Ultramarine Pink': 'Rosa Ultramar',
  'Ultramarine Violet': 'Violeta Ultramar',
  'Violet Soap Colorant': 'Colorante de Jabón Violeta',
  'Volcanic Ash': 'Ceniza Volcánica',
  'Yellow Colorant': 'Colorante Amarillo',
  'Yellow Dock': 'Acedera Amarilla',
  'Yellow Soap Colorant': 'Colorante de Jabón Amarillo',
  'Zinc PCA': 'PCA de Zinc',
};

const LEX_ENTRIES = Object.entries(LEX).sort((a, b) => b[0].length - a[0].length);

function translateWords(text) {
  let out = text;
  for (const [en, es] of LEX_ENTRIES) {
    const re = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, es);
  }
  return out;
}

function toSpanish(name) {
  const paren = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    return `${toSpanish(paren[1].trim())} (${toSpanish(paren[2].trim())})`;
  }

  if (/\sEO$/i.test(name)) {
    const base = name.replace(/\sEO$/i, '').trim();
    return `Aceite Esencial de ${translateWords(base)}`;
  }
  if (/\sFO$/i.test(name)) {
    const base = name.replace(/\sFO$/i, '').trim();
    return `Aceite de Fragancia ${translateWords(base)}`;
  }
  if (/ Fragrance Oil$/i.test(name)) {
    const base = name.replace(/ Fragrance Oil$/i, '').trim();
    return `Aceite de Fragancia de ${translateWords(base)}`;
  }
  if (/ Essential Oil$/i.test(name)) {
    const base = name.replace(/ Essential Oil$/i, '').trim();
    return `Aceite Esencial de ${translateWords(base)}`;
  }
  if (/ Seed Oil$/i.test(name)) {
    const base = name.replace(/ Seed Oil$/i, '').trim();
    return `Aceite de Semilla de ${translateWords(base)}`;
  }
  if (/ Oil$/i.test(name)) {
    const base = name.replace(/ Oil$/i, '').trim();
    return `Aceite de ${translateWords(base)}`;
  }
  if (/ Butter$/i.test(name)) {
    const base = name.replace(/ Butter$/i, '').trim();
    return `Manteca de ${translateWords(base)}`;
  }
  if (/ Powder$/i.test(name)) {
    const base = name.replace(/ Powder$/i, '').trim();
    return `Polvo de ${translateWords(base)}`;
  }
  if (/ Extract$/i.test(name)) {
    const base = name.replace(/ Extract$/i, '').trim();
    return `Extracto de ${translateWords(base)}`;
  }
  if (/ Wax$/i.test(name)) {
    const base = name.replace(/ Wax$/i, '').trim();
    return `Cera de ${translateWords(base)}`;
  }
  if (/ Clay$/i.test(name)) {
    const base = name.replace(/ Clay$/i, '').trim();
    return `Arcilla ${translateWords(base)}`;
  }
  if (/ Mirage Mica$/i.test(name)) {
    const base = name.replace(/ Mirage Mica$/i, '').trim();
    return `Mica Mirage ${translateWords(base)}`;
  }
  if (/ Mica$/i.test(name)) {
    const base = name.replace(/ Mica$/i, '').trim();
    return `Mica ${translateWords(base)}`;
  }
  if (/ Soap Colorant$/i.test(name)) {
    const base = name.replace(/ Soap Colorant$/i, '').trim();
    return `Colorante de Jabón ${translateWords(base)}`;
  }
  if (/ Colorant$/i.test(name)) {
    const base = name.replace(/ Colorant$/i, '').trim();
    return `Colorante ${translateWords(base)}`;
  }
  if (/ Acid$/i.test(name)) {
    const base = name.replace(/ Acid$/i, '').trim();
    return `Ácido ${translateWords(base)}`;
  }
  if (/ Complex$/i.test(name)) {
    const base = name.replace(/ Complex$/i, '').trim();
    return `Complejo de ${translateWords(base)}`;
  }
  if (/ Glitter$/i.test(name)) {
    const base = name.replace(/ Glitter$/i, '').trim();
    return `Purpurina ${translateWords(base)}`;
  }
  if (/ Beads$/i.test(name)) {
    const base = name.replace(/ Beads$/i, '').trim();
    return `Perlas de ${translateWords(base)}`;
  }
  if (/ Bioferment$/i.test(name)) {
    const base = name.replace(/ Bioferment$/i, '').trim();
    return `Biofermento de ${translateWords(base)}`;
  }
  if (/ Peptide$/i.test(name)) {
    const base = name.replace(/ Peptide$/i, '').trim();
    return `Péptido de ${translateWords(base)}`;
  }
  if (/ Alcohol$/i.test(name)) {
    const base = name.replace(/ Alcohol$/i, '').trim();
    return `Alcohol ${translateWords(base)}`;
  }

  return translateWords(name);
}

function resolveSpanish(name, key, enJson, esJson) {
  if (MANUAL_OVERRIDES[name]) return MANUAL_OVERRIDES[name];
  const enVal = enJson.ingredientNames?.[key] ?? name;
  const existing = esJson.ingredientNames?.[key];
  if (existing && existing !== enVal) return existing;
  return toSpanish(name);
}

const seedText = fs.readFileSync(seedPath, 'utf8');
const names = extractNames(seedText);

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const enNames = {};
const esNames = {};

let translated = 0;
let stillEnglish = 0;

for (const name of names.sort((a, b) => a.localeCompare(b))) {
  const key = toKey(name);
  const enVal = en.ingredientNames?.[key] ?? name;
  enNames[key] = enVal;
  const esVal = resolveSpanish(name, key, en, es);
  esNames[key] = esVal;
  if (esVal === enVal) stillEnglish++;
  else translated++;
}

en.ingredientNames = enNames;
es.ingredientNames = esNames;

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, 'utf8');
fs.writeFileSync(esPath, `${JSON.stringify(es, null, 2)}\n`, 'utf8');

console.log(`Synced ${names.length} ingredient names to en.json and es.json`);
console.log(`Spanish entries: ${translated} translated, ${stillEnglish} same as English (INCI/brand names)`);
