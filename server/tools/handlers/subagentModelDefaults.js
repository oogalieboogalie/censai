const TIER_MODEL_DEFAULTS = {
  nano: { provider: 'ollama', name: 'gemma4:31b:cloud' },
  worker: { provider: 'ollama', name: 'minimax-m2.5:cloud' },
  reviewer: { provider: 'ollama', name: 'gemma4:31b:cloud' },
};

const CLASS_MODEL_DEFAULTS = {
  scout: { provider: 'ollama', name: 'gemma4:31b:cloud' },
  builder: { provider: 'ollama', name: 'minimax-m2.5:cloud' },
  auditor: { provider: 'ollama', name: 'minimax-m2.5:cloud' },
  sentry: { provider: 'ollama', name: 'gemma4:31b:cloud' },
};

/**
 * Resolves the (provider, model) pair for a sub-agent based on tier, class,
 * and an optional explicit override.
 *
 * Precedence:
 *   1. `explicit` ("provider/name" or just "name" → defaults to ollama) wins
 *      over everything when present.
 *   2. `tier` defaults always apply when the tier is recognised.
 *   3. `agentClass` defaults only fill in when tier did not set a value,
 *      so an explicit tier wins over class.
 */
export function resolveModelDefaults(tier, agentClass, explicit) {
  let modelProvider = null;
  let modelName = null;

  if (tier && TIER_MODEL_DEFAULTS[tier]) {
    modelProvider = TIER_MODEL_DEFAULTS[tier].provider;
    modelName = TIER_MODEL_DEFAULTS[tier].name;
  }

  if (agentClass && CLASS_MODEL_DEFAULTS[agentClass]) {
    modelProvider = modelProvider || CLASS_MODEL_DEFAULTS[agentClass].provider;
    modelName = modelName || CLASS_MODEL_DEFAULTS[agentClass].name;
  }

  if (explicit) {
    const slashIdx = explicit.indexOf('/');
    if (slashIdx > 0) {
      modelProvider = explicit.slice(0, slashIdx);
      modelName = explicit.slice(slashIdx + 1);
    } else {
      modelProvider = 'ollama';
      modelName = explicit;
    }
  }

  return { modelProvider, modelName };
}
