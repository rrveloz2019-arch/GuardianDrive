// registry.js
// The growth engine: every new thing GuardianDrive can DO (call, text,
// email, calendar, search, docs...) registers here as a "capability."
// Command mapping (Part 3 of the dashboard) points trigger phrases at
// capability actions by name - so adding a new skill later never
// requires touching the command-mapping or dashboard code.

const capabilities = new Map();

// A capability looks like:
// {
//   id: 'email',
//   label: 'Email',
//   tier: 'paid' | 'free',
//   actions: {
//     read_latest: { description: '...', handler: async (params, ctx) => {...} },
//     send: { description: '...', handler: async (params, ctx) => {...} },
//   }
// }
export function registerCapability(capability) {
  if (!capability.id) throw new Error('Capability must have an id');
  if (!capability.actions || Object.keys(capability.actions).length === 0) {
    throw new Error(`Capability "${capability.id}" must define at least one action`);
  }
  capabilities.set(capability.id, capability);
}

export function getCapability(id) {
  return capabilities.get(id);
}

export function listCapabilities() {
  return Array.from(capabilities.values()).map((c) => ({
    id: c.id,
    label: c.label,
    tier: c.tier,
    actions: Object.entries(c.actions).map(([actionId, action]) => ({
      actionId,
      description: action.description,
    })),
  }));
}

// Executes capability.action_id with params, respecting tier gating.
export async function runCapabilityAction(capabilityId, actionId, params, ctx = {}) {
  const capability = capabilities.get(capabilityId);
  if (!capability) {
    const err = new Error(`Unknown capability: ${capabilityId}`);
    err.code = 'UNKNOWN_CAPABILITY';
    throw err;
  }
  const action = capability.actions[actionId];
  if (!action) {
    const err = new Error(`Unknown action "${actionId}" on capability "${capabilityId}"`);
    err.code = 'UNKNOWN_ACTION';
    throw err;
  }
  if (capability.tier === 'paid' && ctx.userTier !== 'paid') {
    const err = new Error(`"${capability.label}" requires a paid subscription`);
    err.code = 'TIER_REQUIRED';
    throw err;
  }
  return action.handler(params, ctx);
}

// Test/dev helper - clears the registry between test runs.
export function _resetRegistryForTests() {
  capabilities.clear();
}
