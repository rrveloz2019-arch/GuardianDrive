# GuardianDrive

A hands-free AI personal secretary for driving. Fully voice-controlled —
no screen interaction required for core actions — invoked by a custom
wake word (e.g. "Hey Juanita").

## Status

**Phase 1, backend foundation.** The setup-dashboard API is built and
tested. No mobile app or real speech/telephony integrations are wired
yet — those are the next steps.

## Why iOS work is paused here

Native iOS development requires Xcode, which only runs on macOS. This
project is currently being developed on a Windows machine, so the
`ios-app/` folder holds SwiftUI source ready to open in Xcode once Mac
access (a physical Mac, or a cloud Mac CI service) is available. The
`backend/` is fully cross-platform and runs/tests on Windows today.

## Architecture

```
GuardianDrive/
├── backend/                     <- cross-platform Node/Express API
│   ├── src/
│   │   ├── app.js               <- Express app wiring (no server start - testable)
│   │   ├── index.js             <- actual server entrypoint (npm start)
│   │   ├── services/
│   │   │   ├── identityService.js        <- Dashboard Part 1: name + wake word
│   │   │   ├── voiceProfileService.js    <- Dashboard Part 2: voice training state
│   │   │   └── commandMappingService.js  <- Dashboard Part 3: trigger phrase -> action
│   │   ├── capabilities/         <- THE GROWTH ENGINE (see below) - all 6 Phase 1 skills:
│   │   │   ├── registry.js       <- tier-gated execution engine
│   │   │   ├── index.js          <- registers every capability the app has
│   │   │   ├── search.js         <- free tier
│   │   │   ├── calls.js          <- free tier (contact resolution only - see note below)
│   │   │   ├── texts.js          <- free tier (message compose only - see note below)
│   │   │   ├── email.js          <- paid tier
│   │   │   ├── calendar.js       <- paid tier
│   │   │   └── documents.js      <- paid tier
│   │   └── routes/               <- HTTP endpoints for each service
│   ├── data/                     <- local JSON storage (gitignored - not committed)
│   └── test/                     <- automated verification scripts (30 checks, all passing)
└── ios-app/                      <- SwiftUI project (build on a Mac)
```

### The capability registry: how this grows

Every action GuardianDrive can perform - make a call, send a text, read
email, set an appointment, search the web - is a **capability** with a
common shape:

```js
{
  id: 'email',
  label: 'Email',
  tier: 'paid',        // or 'free' - maps directly to the freemium model
  actions: {
    read_latest: { description: '...', handler: async (params, ctx) => {...} },
  }
}
```

**To add a new skill later** (calendar, calls, texts, documents): write one
new file in `capabilities/`, add one line to `capabilities/index.js`. No
other code changes. The command-mapping dashboard automatically can point
any trigger phrase at the new capability's actions.

This is what "growing capabilities" means architecturally: the surface
area for adding a new skill is one file, not a rewrite.

### Request flow (how a voice command actually runs)

1. Wake word detected on-device (not yet built - future: on-device wake
   word model, e.g. Porcupine or a custom model)
2. Speech-to-text converts the phrase to text (not yet wired - future:
   a speech vendor)
3. Text is POSTed to `/api/commands/resolve-and-run`
4. `commandMappingService` matches it against configured trigger phrases
5. `capabilities/registry` runs the matched capability's action, gated
   by the user's subscription tier
6. Result is returned (future: converted back to speech via TTS)

## What's real vs. stubbed right now

| Piece | Status |
|---|---|
| Identity (name + wake word) setup + validation | **Real, tested** |
| Voice profile progress tracking | **Real, tested** (actual voice biometric ML training is NOT wired - needs a speech vendor decision) |
| Command mapping CRUD + phrase matching | **Real, tested** (substring match - will need real NLU/fuzzy matching later) |
| Capability registry + tier gating | **Real, tested** |
| Search capability | Stub - returns a "not connected" response, no real search API yet |
| Email capability | Stub - returns a "not connected" response, no Gmail OAuth/API yet |
| Calendar capability | Stub - returns a "not connected" response, no Google Calendar OAuth/API or date/time parser yet |
| Wake-word detection | Not built |
| Speech-to-text / text-to-speech | Not built |
| Phone calls / SMS (CallKit, Telecom API) | Not built - iOS/Android native, needs Mac for iOS side |
| iOS app (SwiftUI) | Not built |

## Running the backend

```bash
cd backend
npm install
npm start          # runs on http://localhost:8788
npm test           # runs automated verification (node --test)
node test/verify-full-system.mjs   # full end-to-end check
```
