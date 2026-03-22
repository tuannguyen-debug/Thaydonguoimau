/**
 * Gemini API Integration Module
 * Handles communication with Google Gemini API for multiple image editing features
 */
import { GoogleGenAI } from '@google/genai';

/**
 * Mode prompts for Tab 1 — Fashion clothing replacement
 */
const FASHION_MODE_PROMPTS = {
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
 * Prompts for Tab 2–8 — Single image editing features
 */
const FEATURE_PROMPTS = {
  // Tab 2: Làm nét ảnh mờ
  upscale: `You are an expert AI image enhancement specialist. I am providing you with ONE image that needs upscaling and sharpening.

YOUR TASK: Upscale this image to 2K or 4K quality using AI enhancement:
1. Keep ALL original details intact — skin texture, hair strands, lighting, shadows.
2. Increase sharpness and clarity moderately — do NOT over-sharpen.
3. Preserve natural skin appearance — no plastic or artificial look.
4. Maintain original color temperature and white balance.
5. Remove any compression artifacts or blur while keeping the image natural.
6. The result must look like a professionally shot photo, not an AI-generated image.
7. Output ONLY the enhanced image — no text explanation.`,

  // Tab 3: Phục hồi ảnh cũ
  restore: `You are an expert AI photo restoration specialist. I am providing you with ONE old or degraded image that needs restoration.

YOUR TASK: Analyze and restore this image following these 5 steps:
1. SHARPEN: Increase overall sharpness while preserving natural details.
2. DENOISE: Reduce noise and grain artifacts from old film or low-light capture.
3. COLOR RESTORE: Restore faded or yellowed colors to natural, vibrant tones.
4. BRIGHTEN: Illuminate dark/shadow areas while preserving highlights — no blown-out areas.
5. BALANCE: Apply overall tonal balance for a cohesive, natural-looking result.

IMPORTANT: Keep the restoration natural and authentic — do NOT over-process. The result should feel like the original photo at its best, not an artificial recreation.
Output ONLY the restored image — no text explanation.`,

  // Tab 4: Chỉnh da chân dung
  skinRetouch: `You are an expert AI portrait retouching specialist. I am providing you with ONE portrait photo that needs skin enhancement.

YOUR TASK: Retouch the skin with a natural studio-quality finish:
1. Apply gentle skin smoothing while PRESERVING natural skin texture — pores, fine lines must remain visible.
2. Remove small blemishes (acne spots, temporary marks) but DO NOT remove natural skin features (freckles, moles, expression lines).
3. Even out skin tone subtly — reduce redness or uneven patches.
4. Apply soft, flattering lighting enhancement — mimicking professional studio lighting.
5. Keep the overall look NATURAL — the skin should look real, never plastic or waxy.
6. Preserve all facial features, hair, and background exactly as they are.
7. Output ONLY the retouched image — no text explanation.`,

  // Tab 5: Xóa khuyết điểm
  removeDefects: `You are an expert AI image inpainting specialist. I am providing you with ONE image that has small defects that need removal.

YOUR TASK: Remove small defects and imperfections using professional inpainting techniques:
1. Identify and remove scratches, dust spots, small unwanted objects, and blemishes.
2. Fill removed areas seamlessly — matching surrounding texture, color, and lighting perfectly.
3. Preserve the background, surrounding details, and overall composition.
4. Leave NO visible trace of editing — the result should look completely natural.
5. Do NOT alter or modify any major elements of the image — only remove small imperfections.
6. Maintain the original image resolution and quality.
7. Output ONLY the cleaned image — no text explanation.`,

  // Tab 6: Chỉnh sáng & màu ảnh tối
  brighten: `You are an expert AI photo lighting and color correction specialist. I am providing you with ONE dark or underexposed image.

YOUR TASK: Brighten and color-correct this image naturally:
1. Lift shadows to reveal hidden details in dark areas.
2. Preserve highlights — do NOT blow out bright areas or create clipping.
3. Add gentle contrast enhancement for depth and dimension.
4. Maintain the ORIGINAL color palette — do NOT shift colors or add color casts.
5. The brightening should feel natural — as if the photo was taken with proper exposure.
6. Preserve all textures, details, and fine elements in the image.
7. The result should be brighter but never harsh, washed-out, or artificially lit.
8. Output ONLY the corrected image — no text explanation.`,

  // Tab 7: Tách nền & thay nền
  changeBg: `You are an expert AI background removal and replacement specialist. I am providing you with ONE image where the main subject needs a new background.

YOUR TASK: Separate the main subject and replace the background:
1. Precisely cut out the main subject (person/object) from the background — hair, edges, and fine details must be clean and accurate.
2. Replace the background with a clean, bright STUDIO backdrop — simple, minimalist, and professional.
3. Add subtle, realistic drop shadow beneath the subject to create depth and prevent a "cut-and-paste" look.
4. Match the lighting on the subject with the new background — ensure consistent light direction and color temperature.
5. Ensure edges between subject and background blend naturally — no harsh outlines or halos.
6. Preserve ALL details of the subject — face, clothing, accessories, hair.
7. Output ONLY the final composited image — no text explanation.`,

  // Tab 8: Nâng cấp toàn diện
  fullUpgrade: `You are an expert AI photo enhancement specialist. I am providing you with ONE image that needs comprehensive enhancement for social media posting.

YOUR TASK: Create a premium enhanced version of this image:
1. SHARPEN: Increase overall image sharpness for crisp, clear details.
2. COLOR CORRECT: Enhance colors for richer, more vibrant tones while keeping them natural.
3. BRIGHTEN: Improve lighting — lift shadows, enhance mid-tones, preserve highlights.
4. CLEAN: Remove small blemishes, dust spots, and minor imperfections.
5. The final result should look like a professionally edited photo suitable for viewing on mobile devices.
6. Maintain the AUTHENTIC style of the original — do NOT make it look artificial or over-processed.
7. The enhancement should be suitable for posting on Facebook, Instagram, or Zalo.
8. Output ONLY the enhanced image — no text explanation.`
};

/**
 * Quality to image size mapping
 */
const QUALITY_MAP = {
  '1K': '1K',
  '2K': '2K',
  '4K': '4K',
  '8K': '4K',
};

/**
 * Call the Gemini API to generate a fashion-edited image (Tab 1)
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

  let prompt = FASHION_MODE_PROMPTS[mode];
  if (!prompt) {
    throw new Error(`Invalid mode: ${mode}. Must be 1, 2, or 3.`);
  }

  // Append quality hint
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

/**
 * Call the Gemini API for single-image editing features (Tab 2–8)
 */
export async function generateImageEdit({
  apiKey,
  model,
  featureKey,
  quality = '2K',
  imageBase64,
  imageMime,
}) {
  const ai = new GoogleGenAI({ apiKey });

  let prompt = FEATURE_PROMPTS[featureKey];
  if (!prompt) {
    throw new Error(`Invalid feature key: ${featureKey}`);
  }

  // Append quality hint
  if (quality === '8K') {
    prompt += '\nGenerate the output at the HIGHEST possible resolution with ultra-sharp detail (8K quality).';
  } else if (quality === '4K') {
    prompt += '\nGenerate the output at very high resolution with sharp detail (4K quality).';
  }

  const contents = [
    { text: prompt },
    {
      inlineData: {
        mimeType: imageMime,
        data: imageBase64,
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
