# node-voicevox-core-dynamic

Node.js binding for [voicevox_core](https://github.com/VOICEVOX/voicevox_core) using [koffi](https://github.com/Koromix/koffi).

## Features

- 🚀 Function-based API (no classes)
- ⚡ Async/await support for non-blocking operations
- 🔒 Type-safe with TypeScript strict mode
- 🎯 Brand types for opaque handles
- 📦 Dynamic library loading with configurable paths

## Installation

```bash
pnpm add node-voicevox-core-dynamic
# or
npm install node-voicevox-core-dynamic
```

## Prerequisites

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

## API Reference

### Types

#### Handles (Brand Types)

- `OnnxruntimeHandle` - ONNX Runtime instance
- `OpenJtalkHandle` - OpenJTalk text analyzer
- `SynthesizerHandle` - Voice synthesizer
- `VoiceModelFileHandle` - Voice model file (VVM)

#### Enums

- `VoicevoxAccelerationMode` - Hardware acceleration mode (Auto, Cpu, Gpu)
- `VoicevoxResultCode` - Result codes for error handling
- `VoicevoxUserDictWordType` - User dictionary word types

#### Options

- `LoadOnnxruntimeOptions` - ONNX Runtime loading options
- `InitializeOptions` - Synthesizer initialization options
- `SynthesisOptions` - Audio synthesis options
- `TtsOptions` - Text-to-speech options

#### Data Models

- `AudioQuery` - Audio query for synthesis
- `AccentPhrase` - Accent phrase structure
- `Mora` - Mora (phonetic unit)

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
- `loadVoiceModel(synthesizer, model)` - **async** Load voice model
- `unloadVoiceModel(synthesizer, modelId)` - Unload voice model
- `isGpuMode(synthesizer)` - Check if GPU mode
- `isLoadedVoiceModel(synthesizer, modelId)` - Check if model is loaded
- `getSynthesizerMetasJson(synthesizer)` - Get loaded models metadata

#### Audio Generation

- `createAudioQuery(synthesizer, text, styleId)` - **async** Create AudioQuery from text
- `synthesis(synthesizer, audioQuery, styleId, options?)` - **async** Synthesize from AudioQuery
- `tts(synthesizer, text, styleId, options?)` - **async** Direct text-to-speech

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
- [koffi](https://github.com/Koromix/koffi) - Fast FFI for Node.js
