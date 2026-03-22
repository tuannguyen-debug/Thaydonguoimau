/**
 * Gemini API Integration Module
 * Handles communication with Google Gemini API for fashion image editing
 */
import { GoogleGenAI } from '@google/genai';

/**
 * Mode prompts for different clothing replacement operations
 */
const MODE_PROMPTS = {
  1: `You are an expert AI fashion image editor. I am providing you with TWO images:
- IMAGE 1: A photo of a model wearing their current outfit.
- IMAGE 2: A reference photo of a NEW top/shirt/jacket garment.

YOUR TASK: Generate a single NEW photorealistic image where:
1. The model's face, hairstyle, body proportions, pose, and background remain EXACTLY the same as in IMAGE 1.
2. The model's bottom clothing (pants, skirt, shorts, shoes) remains EXACTLY the same as in IMAGE 1.
3. ONLY the top garment (shirt, blouse, jacket, etc.) is REPLACED with the garment from IMAGE 2.
4. The new top must fit naturally on the model's body — correct proportions, proper draping, natural fabric folds matching the pose.
5. Lighting, shadows, and color temperature on the new garment must match the scene in IMAGE 1.
6. The material, color, pattern, and texture of the new garment must be accurately reproduced from IMAGE 2.
7. Hands and fingers must remain anatomically correct.
8. Output ONLY the image — no text explanation.`,

  2: `You are an expert AI fashion image editor. I am providing you with TWO images:
- IMAGE 1: A photo of a model wearing their current outfit.
- IMAGE 2: A reference photo of a NEW bottom garment (pants, skirt, or shorts).

YOUR TASK: Generate a single NEW photorealistic image where:
1. The model's face, hairstyle, body proportions, pose, and background remain EXACTLY the same as in IMAGE 1.
2. The model's top clothing (shirt, jacket, accessories) remains EXACTLY the same as in IMAGE 1.
3. ONLY the bottom garment (pants, skirt, shorts) is REPLACED with the garment from IMAGE 2.
4. The new bottom must fit naturally on the model's body — correct proportions, proper draping, natural fabric folds matching the pose.
5. Lighting, shadows, and color temperature on the new garment must match the scene in IMAGE 1.
6. The material, color, pattern, and texture of the new garment must be accurately reproduced from IMAGE 2.
7. Shoes should remain the same as in IMAGE 1 unless covered by the new garment.
8. Output ONLY the image — no text explanation.`,

  3: `You are an expert AI fashion image editor. I am providing you with TWO images:
- IMAGE 1: A photo of a model wearing their current outfit.
- IMAGE 2: A reference photo of a complete NEW outfit (full set of clothing).

YOUR TASK: Generate a single NEW photorealistic image where:
1. The model's face, hairstyle, body proportions, pose, and background remain EXACTLY the same as in IMAGE 1.
2. The model's ENTIRE outfit is REPLACED with the full outfit from IMAGE 2.
3. The new outfit must fit naturally on the model's body — correct proportions, proper draping, natural fabric folds matching the pose.
4. Lighting, shadows, and color temperature on the new outfit must match the scene in IMAGE 1.
5. The material, color, pattern, and texture of every piece must be accurately reproduced from IMAGE 2.
6. Hands and fingers must remain anatomically correct.
7. Output ONLY the image — no text explanation.`
};

/**
 * Quality to image size mapping
 */
const QUALITY_MAP = {
  '1K': '1K',
  '2K': '2K',
  '4K': '4K',
  '8K': '4K', // Gemini max is 4K, 8K will use 4K + prompt hint
};

/**
 * Call the Gemini API to generate a fashion-edited image
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model identifier
 * @param {number} mode - Mode (1=top, 2=bottom, 3=full)
 * @param {string} quality - Quality setting (1K, 2K, 4K, 8K)
 * @param {string} modelImageBase64 - Base64 encoded model photo
 * @param {string} modelImageMime - MIME type of model photo
 * @param {string} clothingImageBase64 - Base64 encoded clothing photo
 * @param {string} clothingImageMime - MIME type of clothing photo
 * @returns {Promise<{imageBase64: string, mimeType: string}>}
 */
export async function generateFashionImage({
  apiKey,
  model,
  mode,
  quality = '2K',
  modelImageBase64,
  modelImageMime,
  clothingImageBase64,
  clothingImageMime,
}) {
  const ai = new GoogleGenAI({ apiKey });

  let prompt = MODE_PROMPTS[mode];
  if (!prompt) {
    throw new Error(`Invalid mode: ${mode}. Must be 1, 2, or 3.`);
  }

  // Append quality hint to prompt
  if (quality === '8K') {
    prompt += '\n9. Generate the output at the HIGHEST possible resolution with ultra-sharp detail (8K quality).';
  } else if (quality === '4K') {
    prompt += '\n9. Generate the output at very high resolution with sharp detail (4K quality).';
  }

  const contents = [
    { text: prompt },
    {
      inlineData: {
        mimeType: modelImageMime,
        data: modelImageBase64,
      },
    },
    {
      inlineData: {
        mimeType: clothingImageMime,
        data: clothingImageBase64,
      },
    },
  ];

  const imageSize = QUALITY_MAP[quality] || '2K';

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseModalities: ['Image'],
      imageConfig: {
        imageSize: imageSize,
      },
    },
  });

  // Extract image from response
  if (response.candidates && response.candidates.length > 0) {
    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  throw new Error('Không nhận được ảnh từ API. Vui lòng thử lại hoặc kiểm tra API key.');
}
