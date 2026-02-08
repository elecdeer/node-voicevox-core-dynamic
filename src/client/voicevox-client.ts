/**
 * 高レベルAPIクライアント
 */

import koffi from "koffi";
import { declareFunctions } from "../ffi/functions.js";
import { loadOnnxruntime, getVersion as getOnnxruntimeVersion } from "../api/onnxruntime.js";
import { createOpenJtalk, deleteOpenJtalk } from "../api/open-jtalk.js";
import {
  createSynthesizer,
  deleteSynthesizer,
  loadVoiceModel,
  isGpuMode as synthesizerIsGpuMode,
  getSynthesizerMetasJson,
  createAudioQuery as synthesizerCreateAudioQuery,
  synthesis as synthesizerSynthesis,
  tts as synthesizerTts,
} from "../api/synthesizer.js";
import {
  openVoiceModelFile,
  getVoiceModelId,
  getVoiceModelMetasJson,
  closeVoiceModelFile,
} from "../api/voice-model.js";
import type {
  VoicevoxClient,
  VoicevoxClientOptions,
  VoicevoxModelFile,
  SpeakerMeta,
} from "./types.js";
import type {
  AudioQuery,
  SynthesisOptions,
  TtsOptions,
  VoiceModelFileHandle,
} from "../types/index.js";

/**
 * Voicevoxクライアントを作成する
 *
 * @param options - クライアント初期化オプション
 * @returns Promise<Voicevoxクライアント>
 * @throws {VoicevoxError} 初期化に失敗した場合
 *
 * @example
 * ```typescript
 * await using client = await createVoicevoxClient({
 *   corePath: "./voicevox/libvoicevox_core.dylib",
 *   openJtalkDictDir: "./voicevox/dict/open_jtalk_dic_utf_8-1.11",
 * });
 *
 * await using modelFile = await client.openModelFile("./models/0.vvm");
 * await client.loadModel(modelFile);
 *
 * const styleId = modelFile.metas[0].styles[0].id;
 * const wav = await client.tts("こんにちは", styleId);
 * ```
 */
export async function createVoicevoxClient(
  options: VoicevoxClientOptions,
): Promise<VoicevoxClient> {
  // ライブラリをロード
  const lib = koffi.load(options.corePath);
  const functions = declareFunctions(lib);

  // ONNX Runtimeをロード
  const onnxruntime = await loadOnnxruntime(functions, {
    filename: options.onnxruntimePath,
  });

  // OpenJTalkを初期化
  // onnxruntimeはシングルトンなので、失敗時も解放不要
  const openJtalk = await createOpenJtalk(functions, options.openJtalkDictDir);

  // シンセサイザを初期化
  let synthesizer;
  try {
    synthesizer = await createSynthesizer(
      functions,
      onnxruntime,
      openJtalk,
      options.initializeOptions,
    );
  } catch (error) {
    deleteOpenJtalk(functions, openJtalk);
    throw error;
  }

  // 破棄済みフラグ
  let disposed = false;

  /**
   * 破棄済みチェック
   */
  function ensureNotDisposed(): void {
    if (disposed) {
      throw new Error("VoicevoxClient has been disposed");
    }
  }

  /**
   * モデルファイルオブジェクトを作成
   */
  function createModelFileObject(
    handle: VoiceModelFileHandle,
    metas: readonly SpeakerMeta[],
    id: Uint8Array,
  ): VoicevoxModelFile {
    let modelDisposed = false;

    const modelFile: VoicevoxModelFile = {
      metas,
      id,
      handle,

      close() {
        if (modelDisposed) {
          return;
        }
        modelDisposed = true;
        closeVoiceModelFile(functions, handle);
      },

      [Symbol.dispose]() {
        this.close();
      },
    };

    return modelFile;
  }

  /**
   * クライアントオブジェクト
   */
  const client: VoicevoxClient = {
    // モデル操作

    async openModelFile(path: string): Promise<VoicevoxModelFile> {
      ensureNotDisposed();

      const handle = await openVoiceModelFile(functions, path);
      const metasJson = getVoiceModelMetasJson(functions, handle);
      const metas = JSON.parse(metasJson) as SpeakerMeta[];
      const id = getVoiceModelId(functions, handle);

      return createModelFileObject(handle, metas, id);
    },

    async loadModel(modelFile: VoicevoxModelFile): Promise<void> {
      ensureNotDisposed();
      await loadVoiceModel(functions, synthesizer, modelFile.handle);
    },

    async loadModels(modelFiles: readonly VoicevoxModelFile[]): Promise<void> {
      ensureNotDisposed();
      for (const modelFile of modelFiles) {
        await loadVoiceModel(functions, synthesizer, modelFile.handle);
      }
    },

    // 音声合成

    async tts(
      text: string,
      styleId: number,
      options?: TtsOptions,
    ): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerTts(functions, synthesizer, text, styleId, options);
    },

    async createAudioQuery(text: string, styleId: number): Promise<AudioQuery> {
      ensureNotDisposed();
      return synthesizerCreateAudioQuery(functions, synthesizer, text, styleId);
    },

    async synthesize(
      audioQuery: AudioQuery,
      styleId: number,
      options?: SynthesisOptions,
    ): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerSynthesis(functions, synthesizer, audioQuery, styleId, options);
    },

    // 情報取得

    getLoadedSpeakers(): readonly SpeakerMeta[] {
      ensureNotDisposed();
      const metasJson = getSynthesizerMetasJson(functions, synthesizer);
      return JSON.parse(metasJson) as SpeakerMeta[];
    },

    getVersion(): string {
      ensureNotDisposed();
      return getOnnxruntimeVersion(functions);
    },

    get isGpuMode(): boolean {
      ensureNotDisposed();
      return synthesizerIsGpuMode(functions, synthesizer);
    },

    // 低レベルAPI連携

    get functions() {
      return functions;
    },

    get synthesizerHandle() {
      return synthesizer;
    },

    get onnxruntimeHandle() {
      return onnxruntime;
    },

    get openJtalkHandle() {
      return openJtalk;
    },

    // リソース管理

    close() {
      if (disposed) {
        return;
      }
      disposed = true;
      deleteSynthesizer(functions, synthesizer);
      deleteOpenJtalk(functions, openJtalk);
    },

    [Symbol.dispose]() {
      this.close();
    },
  };

  return client;
}
