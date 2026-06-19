import express from 'express';
import {
  callModel,
  IMAGE_GENERATION_MODEL_KIND,
  resolveImageGenerationModelConfig,
  workspaceUsageSink,
} from '../../aiGateway/index.js';
import {
  deleteGalleryImage,
  listGalleryImages,
  saveGalleryImage,
} from './galleryStore.js';
import {
  buildImagePrompt,
  imageRecordFromResponse,
} from './imageRecords.js';

export const imagesRouter = express.Router();
const IMAGE_STUDIO_MODELS = new Set([
  'imagen-4.0-generate-001',
  'imagen-4.0-ultra-generate-001',
  'imagen-4.0-fast-generate-001',
]);

imagesRouter.get('/gallery', async (_req, res) => {
  res.json({ images: await listGalleryImages() });
});

imagesRouter.delete('/gallery/:id', async (req, res) => {
  const deleted = await deleteGalleryImage(req.params.id);
  res.status(deleted ? 200 : 404).json({ deleted });
});

imagesRouter.post('/generate', async (req, res) => {
  const {
    prompt,
    additionalInstructions = '',
    model = 'imagen-4.0-generate-001',
    canvasState = null,
    canvasImage = null,
    sourceWindowId = null,
    workspaceId = null,
  } = req.body || {};

  if (!String(prompt || '').trim()) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (!IMAGE_STUDIO_MODELS.has(String(model))) {
    return res.status(400).json({ error: 'Unsupported image model' });
  }

  try {
    const config = resolveImageGenerationModelConfig({ modelProvider: 'google', modelName: model });
    const finalPrompt = buildImagePrompt({ prompt, additionalInstructions, canvasState, canvasImage });
    const response = await callModel({
      kind: IMAGE_GENERATION_MODEL_KIND,
      config,
      body: {
        model: config.model,
        prompt: finalPrompt,
      },
      timeoutMs: 90000,
      logContext: { source: 'image-studio' },
      usageAttribution: {
        workspaceId,
        actor: { kind: 'user', id: req.session?.userId || 'local-user' },
        source: 'image-studio',
      },
      usageSink: workspaceUsageSink,
    });
    const image = imageRecordFromResponse({
      response,
      prompt: String(prompt).trim(),
      additionalInstructions: String(additionalInstructions || '').trim(),
      model: config.model,
      sourceWindowId,
    });
    await saveGalleryImage(image);
    res.json({ image });
  } catch (err) {
    console.error('Image Studio generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
