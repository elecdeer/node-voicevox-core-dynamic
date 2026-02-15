/**
 * VOICEVOX CORE Node.js Binding
 *
 * koffiを使用したvoicevox_coreのNode.jsバインディング
 *
 * @packageDocumentation
 */

// 型定義
export type {
  // ハンドル型
  OnnxruntimeHandle,
  OpenJtalkHandle,
  SynthesizerHandle,
  VoiceModelFileHandle,
  // オプション型
  LoadOnnxruntimeOptions,
  InitializeOptions,
  SynthesisOptions,
  TtsOptions,
  // データモデル型
  AudioQuery,
  AccentPhrase,
  Mora,
} from "./types/index.js";

// 列挙型
export {
  VoicevoxAccelerationMode,
  VoicevoxResultCode,
  VoicevoxUserDictWordType,
} from "./types/index.js";

// エラー
export { VoicevoxError } from "./errors/index.js";

// API関数
export {
  // ONNX Runtime
  loadOnnxruntime,
  getOnnxruntime,
  getOnnxruntimeSupportedDevicesJson,
  getVersion,
  // OpenJTalk
  createOpenJtalk,
  deleteOpenJtalk,
  // 音声モデル
  openVoiceModelFile,
  getVoiceModelId,
  getVoiceModelMetasJson,
  closeVoiceModelFile,
  // シンセサイザ
  createSynthesizer,
  deleteSynthesizer,
  loadVoiceModel,
  unloadVoiceModel,
  isGpuMode,
  isLoadedVoiceModel,
  getSynthesizerMetasJson,
  createAudioQuery,
  createAudioQueryFromKana,
  createAccentPhrases,
  createAccentPhrasesFromKana,
  createAudioQueryFromAccentPhrases,
  synthesis,
  tts,
  ttsFromKana,
} from "./api/index.js";

// 高レベルAPI
export { createVoicevoxClient } from "./client/index.js";
export type {
  VoicevoxClient,
  VoicevoxClientOptions,
  CharacterMeta,
  CharacterMetaWithModelInfo,
} from "./client/index.js";
