import fs from 'fs/promises';
import path from 'path';

/**
 * Ollama AI Pipeline for Generating Ingredient SVGs
 * 
 * Architectural Decision: SVG vs PNG
 * We are using `gpt-oss:20b` to generate raw SVG code instead of `x/flux2-klein:4b` for PNGs.
 * Reasons:
 * 1. Visual Consistency: The current app uses inline React SVG components (`ingredientIconPaths.tsx` & `recipeHeroIcons.tsx`).
 *    PNGs would look pixelated, require new image loaders, and wouldn't scale well.
 * 2. VRAM Constraints: By skipping the 5.7GB image model entirely, we completely eliminate
 *    the OOM risk on the 16GB RTX 5070 Ti. We only need the 14GB text model.
 * 3. Execution Speed: Generating text-based SVG is significantly faster than diffusion image generation.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gpt-oss:20b';
const OUTPUT_FILE = path.resolve('./src/data/recipeHeroIcons.tsx');

const SYSTEM_PROMPT = `
You are an expert React UI developer and graphic designer.
Your task is to generate new ingredient icon components as inline SVG React components.

STRICT CATEGORIZATION RULES:
- Fruits (watermelon, mango, citrus, berries, coconut, avocado, etc.): draw the edible fruit — wedge, whole fruit, or slice. NEVER the plant, vine, tree, bush, or leaves.
- Carrier oils: colored oil drops; if the oil is from a fruit/nut, show that fruit/nut, not foliage
- Essential & fragrance oils: small perfume bottles in each scent’s color — unless the name is a fruit, then show the fruit
- Botanicals (herbs/flowers only): illustrated sprigs, flowers, roots, leaves
- Clays & minerals: colored clay bowls, salt crystals, charcoal chunks
- YumCraft dyes: liquid drops in each dye’s color
- Smalltongue micas: sparkle stars in each shade
- Soap bases: soap bar illustrations with bubbles/texture
- Additives: honey hexagons, vitamin capsules, wax blocks, etc.

TECHNICAL CONSTRAINTS:
1. Must use a \`viewBox="0 0 40 40"\`.
2. Must use simple, flat geometric shapes (circles, rects, paths).
3. Must be full color (e.g., fill="#A78BFA", stroke="#6B7280"). Do not use \`currentColor\`.
4. No tiny details that disappear at 20x20 scaling.
5. DO NOT use or prompt for "a large, intricate, multi-layered cluster of unlit floating vector icons".

Return ONLY valid TypeScript/React code exporting the components. Do not use markdown blocks.
`;

async function generateIngredientSVG(ingredientName, category) {
  console.log(`Generating SVG for ${ingredientName} (${category})...`);
  
  const prompt = `Generate a 40x40 SVG React component named \`${ingredientName.replace(/[^a-zA-Z0-9]/g, '')}Icon\` for the ingredient "${ingredientName}", which belongs to the category "${category}". Follow all system prompt rules.`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        stream: false,
        // CRITICAL VRAM MANAGEMENT:
        // Setting keep_alive to 0 forces Ollama to instantly unload the model from VRAM
        // after generation. This ensures we never exceed the 16GB limit, especially if
        // another script triggers a different model afterward.
        keep_alive: 0 
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Pipeline failed:', error);
    return null;
  }
}

async function main() {
  // Example batch of new ingredients
  const ingredientsToGenerate = [
    { name: 'Jojoba Oil', category: 'Carrier oils' },
    { name: 'Peppermint', category: 'Essential & fragrance oils' },
    { name: 'Activated Charcoal', category: 'Clays & minerals' }
  ];

  let generatedCode = '\n\n// --- AI GENERATED ICONS ---\n';

  for (const item of ingredientsToGenerate) {
    const code = await generateIngredientSVG(item.name, item.category);
    if (code) {
      generatedCode += `\n${code}\n`;
    }
  }

  // Append to the existing file
  try {
    await fs.appendFile(OUTPUT_FILE, generatedCode);
    console.log(`\nSuccess! Appended new icons to ${OUTPUT_FILE}`);
  } catch (e) {
    console.error('Failed to write to file:', e);
  }
}

main();
