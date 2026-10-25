# node-voicevox-core-dynamic

Node.js binding for [voicevox_core](https://github.com/VOICEVOX/voicevox_core) using the built-in [node:ffi](https://nodejs.org/api/ffi.html) module — no native npm dependencies.

## Features

- 🚀 Function-based API (no classes)
- ⚡ Async/await support for non-blocking operations (heavy FFI calls run on a worker thread)
- 🔒 Type-safe with TypeScript strict mode
- 🎯 Brand types for opaque handles
- 📦 Dynamic library loading with configurable paths
- 🧩 Zero runtime dependencies (uses the experimental `node:ffi` built-in module)

## Installation

```bash
pnpm add node-voicevox-core-dynamic
# or
npm install node-voicevox-core-dynamic
```

## Prerequisites

### Node.js >= 26.1.0 with `--experimental-ffi`

This package uses the experimental [node:ffi](https://nodejs.org/api/ffi.html) module,
which was added in Node.js v26.1.0 and is gated behind the `--experimental-ffi` flag:

```bash
node --experimental-ffi app.js
# or
NODE_OPTIONS="--experimental-ffi" node app.js
```

> ⚠️ `node:ffi` is an experimental Node.js API (Stability: 1) and might change at any time.

Note: async API calls are dispatched to a single worker thread per loaded library,
so concurrent async calls are serialized.

### voicevox_core v0.17.1 or later

You need to download voicevox_core library separately:

1. Download from [voicevox_core releases](https://github.com/VOICEVOX/voicevox_core/releases)
2. Extract and place the library files in your project
3. Set the environment variable `VOICEVOX_CORE_LIB_PATH` to point to the library

## Usage

> 💡 **More examples**: See the [examples/](./examples) directory for more detailed usage examples including AudioQuery manipulation, GPU mode, and multiple model management.

### Basic Example

```typescript
import {
  loadOnnxruntime,
  createOpenJtalk,
  deleteOpenJtalk,
  createSynthesizer,
  deleteSynthesizer,
  openVoiceModelFile,
  closeVoiceModelFile,
  loadVoiceModel,
  tts,
} from "node-voicevox-core-dynamic";
import { writeFile } from "fs/promises";

async function main() {
  // Set library path (or use environment variable)
  process.env.VOICEVOX_CORE_LIB_PATH = "./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib";

  // Initialize (async operations run on worker threads)
  const onnxruntime = await loadOnnxruntime();
  const openJtalk = await createOpenJtalk("./voicevox/voicevox_core/dict");
  const synthesizer = await createSynthesizer(onnxruntime, openJtalk);

  // Load voice model
  const model = await openVoiceModelFile("./voicevox/voicevox_core/models/sample.vvm");
  await loadVoiceModel(synthesizer, model);
  closeVoiceModelFile(model); // Can be closed after loading

  // Text-to-Speech (async to avoid blocking the event loop)
  const wav = await tts(synthesizer, "こんにちは", 0);
  await writeFile("output.wav", wav);

  // Cleanup
  deleteSynthesizer(synthesizer);
  deleteOpenJtalk(openJtalk);
  // onnxruntime is singleton, no need to delete
}

main();
```

### AudioQuery Example

```typescript
import { createAudioQuery, synthesis, VoicevoxAccelerationMode } from "node-voicevox-core-dynamic";

// Create AudioQuery from text (async)
const audioQuery = await createAudioQuery(synthesizer, "こんにちは", 0);

// Modify AudioQuery (optional)
audioQuery.speedScale = 1.2;
audioQuery.pitchScale = 0.8;

// Synthesize from AudioQuery (async)
const wav = await synthesis(synthesizer, audioQuery, 0, {
  enableInterrogativeUpspeak: true,
});
```

### GPU Mode

```typescript
import { VoicevoxAccelerationMode } from "node-voicevox-core-dynamic";

const synthesizer = await createSynthesizer(onnxruntime, openJtalk, {
  accelerationMode: VoicevoxAccelerationMode.Gpu,
  cpuNumThreads: 0, // auto
});

// Check if GPU mode is active
if (isGpuMode(synthesizer)) {
  console.log("GPU mode is enabled");
}
```

### Streaming Synthesis

Generate audio little by little so that playback can start a fraction of a second after synthesis begins.
Requires the new VVM format (`vvm_format_version=2`); the downloader fetches the latest VVMs by default.

```typescript
import { VOICEVOX_FRAME_RATE } from "node-voicevox-core-dynamic";

const audioQuery = await client.createAudioQuery("こんにちは", styleId);

// Estimate the audio length from the AudioQuery
const frameLength = client.getAudioQueryFrameLength(audioQuery);
console.log(`${frameLength / VOICEVOX_FRAME_RATE} seconds`);

// The first chunk is the WAV header, followed by 16-bit PCM chunks (about 0.3 s each by default).
// Concatenating all chunks yields a complete WAV file.
for await (const chunk of client.streamingSynthesis(audioQuery, styleId, {
  segmentLengthInSecs: 0.3,
})) {
  output.write(chunk);
}

// For fine-grained control over segmentation
using audioFeature = await client.createAudioFeature(audioQuery, styleId);
const segment = Math.round(0.3 * VOICEVOX_FRAME_RATE);
for (let start = 0; start < audioFeature.length; start += segment) {
  const pcm = await audioFeature.render(start, Math.min(start + segment, audioFeature.length));
}
```

### Singing Voice Synthesis

```typescript
import { createSingFrameAudioQuery, frameSynthesis } from "node-voicevox-core-dynamic";
import type { Score } from "node-voicevox-core-dynamic";

// Create a score (musical notation)
const score: Score = {
  notes: [
    { key: 60, frame_length: 15, lyric: "ド" }, // C4
    { key: 62, frame_length: 15, lyric: "レ" }, // D4
    { key: 64, frame_length: 15, lyric: "ミ" }, // E4
    { key: null, frame_length: 10, lyric: "" }, // Rest
  ],
};

// Method 1: Using convenience method
const wav = await client.sing(score, styleId);

// Method 2: Step by step
const frameAudioQuery = await createSingFrameAudioQuery(synthesizer, score, styleId);
// Optionally modify frameAudioQuery parameters
const wav = await frameSynthesis(synthesizer, frameAudioQuery, styleId);
```

**Requirements:**

- Voice model with singing capability (`singing_teacher`, `frame_decode`, or `sing` style)

## API Reference

### Types

#### Handles (Brand Types)

- `OnnxruntimeHandle` - ONNX Runtime instance
- `OpenJtalkHandle` - OpenJTalk text analyzer
- `SynthesizerHandle` - Voice synthesizer
- `VoiceModelFileHandle` - Voice model file (VVM)
- `AudioFeatureHandle` - Intermediate representation for streaming synthesis

#### Enums

- `VoicevoxAccelerationMode` - Hardware acceleration mode (Auto, Cpu, Gpu)
- `VoicevoxOnExistingVoiceModelId` - Behavior when a model with the same ID is already loaded (Error, Reload, Skip)
- `VoicevoxResultCode` - Result codes for error handling
- `VoicevoxUserDictWordType` - User dictionary word types

#### Options

- `LoadOnnxruntimeOptions` - ONNX Runtime loading options
- `InitializeOptions` - Synthesizer initialization options
- `LoadVoiceModelOptions` - Voice model loading options
- `SynthesisOptions` - Audio synthesis options
- `TtsOptions` - Text-to-speech options
- `AudioQueryFrameLengthOptions` - Frame length calculation options
- `StreamingSynthesisOptions` - Streaming synthesis options (start offset and segment length)

#### Data Models

- `AudioQuery` - Audio query for synthesis
- `AccentPhrase` - Accent phrase structure
- `Mora` - Mora (phonetic unit)
- `Score` - Musical score for singing voice synthesis
- `Note` - Musical note with key, duration, and lyric
- `FrameAudioQuery` - Frame-based audio query for singing
- `FramePhoneme` - Phoneme with frame duration

### Functions

#### ONNX Runtime

- `loadOnnxruntime(options?)` - **async** Load and initialize ONNX Runtime
- `getOnnxruntime()` - Get already loaded ONNX Runtime (or null)
- `getOnnxruntimeSupportedDevicesJson(onnxruntime)` - Get supported devices info
- `getVersion()` - Get voicevox_core version

#### OpenJTalk

- `createOpenJtalk(dictDir)` - **async** Create OpenJTalk instance
- `deleteOpenJtalk(openJtalk)` - Delete OpenJTalk instance

#### Voice Model

- `openVoiceModelFile(path)` - **async** Open VVM file
- `getVoiceModelId(model)` - Get model ID (UUID)
- `getVoiceModelMetasJson(model)` - Get model metadata as JSON
- `closeVoiceModelFile(model)` - Close VVM file

#### Synthesizer

- `createSynthesizer(onnxruntime, openJtalk, options?)` - **async** Create synthesizer
- `deleteSynthesizer(synthesizer)` - Delete synthesizer
- `loadVoiceModel(synthesizer, model, options?)` - **async** Load voice model
- `unloadVoiceModel(synthesizer, modelId)` - Unload voice model
- `isGpuMode(synthesizer)` - Check if GPU mode
- `isLoadedVoiceModel(synthesizer, modelId)` - Check if model is loaded
- `getSynthesizerMetasJson(synthesizer)` - Get loaded models metadata

#### Audio Generation

- `createAudioQuery(synthesizer, text, styleId)` - **async** Create AudioQuery from text
- `synthesis(synthesizer, audioQuery, styleId, options?)` - **async** Synthesize from AudioQuery
- `tts(synthesizer, text, styleId, options?)` - **async** Direct text-to-speech

#### Streaming Synthesis

- `streamingSynthesis(synthesizer, audioQuery, styleId, options?)` - **async generator** Yield the WAV header and then PCM chunks
- `createAudioFeature(synthesizer, audioQuery, styleId, options?)` - **async** Create an intermediate representation
- `getAudioFeatureLength(audioFeature)` - Get the number of frames
- `renderAudioFeature(synthesizer, audioFeature, start?, end?)` - **async** Render 16-bit PCM for a frame range
- `deleteAudioFeature(audioFeature)` - Delete an intermediate representation
- `getAudioQueryFrameLength(audioQuery, options?)` - Calculate the number of frames of an AudioQuery
- `createWavHeader(pcmLength, samplingRate, isStereo)` - Create a WAV header for 16-bit PCM
- `wavFromS16le(pcm, samplingRate, isStereo)` - Convert 16-bit PCM to WAV
- `VOICEVOX_FRAME_RATE` - Frame rate (93.75 frames/s)

#### Singing Voice Synthesis

- `createSingFrameAudioQuery(synthesizer, score, styleId)` - **async** Create FrameAudioQuery from score
- `createSingFrameF0(synthesizer, score, frameAudioQuery, styleId)` - **async** Generate frame-wise F0
- `createSingFrameVolume(synthesizer, score, frameAudioQuery, styleId)` - **async** Generate frame-wise volume
- `frameSynthesis(synthesizer, frameAudioQuery, styleId, options?)` - **async** Synthesize singing voice

## Environment Variables

- `VOICEVOX_CORE_LIB_PATH` - Path to voicevox_core dynamic library

If not set, the library will try to load from system paths using platform-specific default names:

- macOS: `libvoicevox_core.dylib`
- Windows: `voicevox_core.dll`
- Linux: `libvoicevox_core.so`

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Lint
pnpm run lint

# Format
pnpm run format

# Test
pnpm run test
```

## License

MIT

## Credits

- [VOICEVOX CORE](https://github.com/VOICEVOX/voicevox_core) - The core library
- [node:ffi](https://nodejs.org/api/ffi.html) - Node.js built-in Foreign Function Interface
