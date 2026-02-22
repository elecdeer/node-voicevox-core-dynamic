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
  createAudioQueryFromKana as synthesizerCreateAudioQueryFromKana,
  createAccentPhrases as synthesizerCreateAccentPhrases,
  createAccentPhrasesFromKana as synthesizerCreateAccentPhrasesFromKana,
  createAudioQueryFromAccentPhrases as synthesizerCreateAudioQueryFromAccentPhrases,
  synthesis as synthesizerSynthesis,
  tts as synthesizerTts,
  ttsFromKana as synthesizerTtsFromKana,
  createSingFrameAudioQuery as synthesizerCreateSingFrameAudioQuery,
  frameSynthesis as synthesizerFrameSynthesis,
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
  CharacterMeta,
  CharacterMetaWithModelInfo,
} from "./types.js";
import type {
  AudioQuery,
  SynthesisOptions,
  TtsOptions,
  Score,
  FrameAudioQuery,
} from "../types/index.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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
 * // モデルをロード
 * await client.loadVoiceModelFromPath("./models/0.vvm");
 *
 * // ロード済みのスピーカー情報を取得
 * const speakers = client.getLoadedSpeakers();
 * const styleId = speakers[0].styles[0].id;
 *
 * // 音声合成
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
   * クライアントオブジェクト
   */
  const client: VoicevoxClient = {
    // モデル操作

    async peekModelFilesMeta(dir: string): Promise<readonly CharacterMetaWithModelInfo[]> {
      ensureNotDisposed();

      const files = await readdir(dir);
      const vvmFiles = files.filter((f) => f.endsWith(".vvm"));

      const results: CharacterMetaWithModelInfo[] = [];
      for (const file of vvmFiles) {
        const modelFilePath = join(dir, file);
        const handle = await openVoiceModelFile(functions, modelFilePath);
        try {
          const metasJson = getVoiceModelMetasJson(functions, handle);
          const metas = JSON.parse(metasJson) as CharacterMeta[];
          const modelId = getVoiceModelId(functions, handle);

          // スピーカーごとにフラット化
          for (const meta of metas) {
            results.push({
              ...meta,
              modelFilePath,
              modelId,
            });
          }
        } finally {
          closeVoiceModelFile(functions, handle);
        }
      }

      return results;
    },

    async loadVoiceModelFromPath(...paths: string[]): Promise<void> {
      ensureNotDisposed();

      for (const path of paths) {
        const handle = await openVoiceModelFile(functions, path);
        try {
          await loadVoiceModel(functions, synthesizer, handle);
        } finally {
          closeVoiceModelFile(functions, handle);
        }
      }
    },
    // 音声合成

    async tts(text: string, styleId: number, options?: TtsOptions): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerTts(functions, synthesizer, text, styleId, options);
    },

    async ttsFromKana(kana: string, styleId: number, options?: TtsOptions): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerTtsFromKana(functions, synthesizer, kana, styleId, options);
    },

    async createAudioQuery(text: string, styleId: number): Promise<AudioQuery> {
      ensureNotDisposed();
      return synthesizerCreateAudioQuery(functions, synthesizer, text, styleId);
    },

    async createAudioQueryFromKana(kana: string, styleId: number): Promise<AudioQuery> {
      ensureNotDisposed();
      return synthesizerCreateAudioQueryFromKana(functions, synthesizer, kana, styleId);
    },

    async createAccentPhrases(
      text: string,
      styleId: number,
    ): Promise<AudioQuery["accent_phrases"]> {
      ensureNotDisposed();
      return synthesizerCreateAccentPhrases(functions, synthesizer, text, styleId);
    },

    async createAccentPhrasesFromKana(
      kana: string,
      styleId: number,
    ): Promise<AudioQuery["accent_phrases"]> {
      ensureNotDisposed();
      return synthesizerCreateAccentPhrasesFromKana(functions, synthesizer, kana, styleId);
    },

    async createAudioQueryFromAccentPhrases(
      accentPhrases: AudioQuery["accent_phrases"],
    ): Promise<AudioQuery> {
      ensureNotDisposed();
      return synthesizerCreateAudioQueryFromAccentPhrases(functions, accentPhrases);
    },

    async synthesize(
      audioQuery: AudioQuery,
      styleId: number,
      options?: SynthesisOptions,
    ): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerSynthesis(functions, synthesizer, audioQuery, styleId, options);
    },

    // 歌唱音声合成

    async createSingFrameAudioQuery(score: Score, styleId: number): Promise<FrameAudioQuery> {
      ensureNotDisposed();
      return synthesizerCreateSingFrameAudioQuery(functions, synthesizer, score, styleId);
    },

    async frameSynthesize(frameAudioQuery: FrameAudioQuery, styleId: number): Promise<Uint8Array> {
      ensureNotDisposed();
      return synthesizerFrameSynthesis(functions, synthesizer, frameAudioQuery, styleId);
    },

    async sing(score: Score, teacherStyleId: number, singerStyleId: number): Promise<Uint8Array> {
      ensureNotDisposed();
      const frameAudioQuery = await synthesizerCreateSingFrameAudioQuery(
        functions,
        synthesizer,
        score,
        teacherStyleId,
      );
      return synthesizerFrameSynthesis(functions, synthesizer, frameAudioQuery, singerStyleId);
    },

    // 情報取得

    getLoadedSpeakers(): readonly CharacterMeta[] {
      ensureNotDisposed();
      const metasJson = getSynthesizerMetasJson(functions, synthesizer);
      return JSON.parse(metasJson) as CharacterMeta[];
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
