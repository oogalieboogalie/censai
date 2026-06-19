import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const callModel = jest.fn();
const workspaceUsageSink = jest.fn();
const resolveImageGenerationModelConfig = jest.fn(({ modelName }) => ({
  provider: 'google',
  model: modelName || 'imagen-4.0-generate-001',
  apiKey: 'key',
}));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'censai-images-'));
process.env.IMAGE_GALLERY_FILE = path.join(tmpDir, 'gallery.json');

jest.unstable_mockModule('../server/aiGateway/index.js', () => ({
  callModel,
  IMAGE_GENERATION_MODEL_KIND: 'image.generation',
  resolveImageGenerationModelConfig,
  workspaceUsageSink,
}));

const { imagesRouter } = await import('../server/routes/images/index.js');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/images', imagesRouter);

afterEach(async () => {
  jest.clearAllMocks();
  await fs.promises.rm(process.env.IMAGE_GALLERY_FILE, { force: true });
});

afterAll(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

describe('/api/images routes', () => {
  test('generates an image through the gateway and saves it to gallery', async () => {
    callModel.mockResolvedValue({
      generatedImages: [{ image: { imageBytes: 'abc', mimeType: 'image/png' } }],
    });

    const res = await request(app).post('/api/images/generate').send({
      prompt: 'a clean app icon',
      additionalInstructions: 'flat vector style',
      model: 'imagen-4.0-fast-generate-001',
      canvasState: { objects: [{ type: 'path' }, { type: 'rect' }, { type: 'rect' }] },
      sourceWindowId: 'w1',
      workspaceId: 'workspace-1',
    });

    expect(res.status).toBe(200);
    expect(res.body.image).toMatchObject({
      src: 'data:image/png;base64,abc',
      prompt: 'a clean app icon',
      additionalInstructions: 'flat vector style',
      model: 'imagen-4.0-fast-generate-001',
      sourceWindowId: 'w1',
    });
    expect(callModel).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'image.generation',
      body: expect.objectContaining({
        prompt: expect.stringContaining('flat vector style'),
      }),
      logContext: { source: 'image-studio' },
      usageAttribution: {
        workspaceId: 'workspace-1',
        actor: { kind: 'user', id: 'local-user' },
        source: 'image-studio',
      },
      usageSink: workspaceUsageSink,
    }));
    expect(callModel.mock.calls[0][0].body.prompt).toContain('Canvas sketch contains: 1 path, 2 rect.');

    const gallery = await request(app).get('/api/images/gallery');
    expect(gallery.body.images).toHaveLength(1);
    expect(gallery.body.images[0].id).toBe(res.body.image.id);
  });

  test('rejects empty prompts', async () => {
    const res = await request(app).post('/api/images/generate').send({ prompt: ' ' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing prompt' });
    expect(callModel).not.toHaveBeenCalled();
  });

  test('rejects unsupported image models', async () => {
    const res = await request(app).post('/api/images/generate').send({
      prompt: 'a clean app icon',
      model: 'not-a-real-imagen-model',
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unsupported image model' });
    expect(callModel).not.toHaveBeenCalled();
  });
});
