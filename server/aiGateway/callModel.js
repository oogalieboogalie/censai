import { resolveChatModelConfig } from './providers.js';
import { resolveEmbeddingModelConfig } from './embeddingProviders.js';
import { requestChatCompletion } from './chatCompletion.js';
import {
  EMBEDDING_MODEL_KIND,
  requestEmbedding,
} from './embedding.js';
import { resolveImageGenerationModelConfig } from './imageProviders.js';
import {
  IMAGE_GENERATION_MODEL_KIND,
  requestImageGeneration,
} from './imageGeneration.js';
import { bestEffortUsageSink } from './usageSink.js';

export const CHAT_COMPLETION_MODEL_KIND = 'chat.completion';
export { EMBEDDING_MODEL_KIND };
export { IMAGE_GENERATION_MODEL_KIND };

export async function callModel({
  kind = CHAT_COMPLETION_MODEL_KIND,
  modelProvider = null,
  modelName = null,
  config = null,
  body,
  timeoutMs,
  logContext = {},
  retry = {},
  usageAttribution = null,
  usageSink = null,
} = {}) {
  const safeUsageSink = bestEffortUsageSink(usageSink);
  if (kind === EMBEDDING_MODEL_KIND) {
    const resolvedConfig = config || resolveEmbeddingModelConfig({
      modelProvider,
      modelName: modelName || body?.model || null,
    });

    return requestEmbedding({
      config: resolvedConfig,
      body,
      timeoutMs,
      logContext,
      usageAttribution,
      usageSink: safeUsageSink,
    });
  }

  if (kind === IMAGE_GENERATION_MODEL_KIND) {
    const resolvedConfig = config || resolveImageGenerationModelConfig({
      modelProvider,
      modelName: modelName || body?.model || null,
    });

    return requestImageGeneration({
      config: resolvedConfig,
      body,
      timeoutMs,
      logContext,
      usageAttribution,
      usageSink: safeUsageSink,
    });
  }

  if (kind !== CHAT_COMPLETION_MODEL_KIND) throw new Error(`Unsupported model call kind: ${kind}`);

  const resolvedConfig = config || resolveChatModelConfig({
    modelProvider,
    modelName: modelName || body?.model || null,
  });

  return requestChatCompletion({
    config: resolvedConfig,
    body,
    timeoutMs,
    logContext,
    retry,
    usageAttribution,
    usageSink: safeUsageSink,
  });
}
