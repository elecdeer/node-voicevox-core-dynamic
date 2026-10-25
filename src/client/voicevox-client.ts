/**
 * 高レベルAPIクライアント
 */

import { loadOnnxruntime } from "../api/onnxruntime.js";
import { getVersion } from "../api/voicevox.js";
import { createOpenJtalk, deleteOpenJtalk } from "../api/open-jtalk.js";
import {
  createSingFrameAudioQuery as synthesizerCreateSingFrameAudioQuery,
  frameSynthesis as synthesizerFrameSynthesis,
} from "../api/song.js";
import { ttsFromKana as synthesizerTtsFromKana } from "../api/talk.js";
import { tts as synthesizerTts } from "../api/talk.js";
import { synthesis as synthesizerSynthesis } from "../api/talk.js";
import { createAudioQueryFromAccentPhrases as synthesizerCreateAudioQueryFromAccentPhrases } from "../api/talk.js";
import { createAccentPhrasesFromKana as synthesizerCreateAccentPhrasesFromKana } from "../api/talk.js";
import { createAccentPhrases as synthesizerCreateAccentPhrases } from "../api/talk.js";
import { createAudioQueryFromKana as synthesizerCreateAudioQueryFromKana } from "../api/talk.js";
import { createAudioQuery as synthesizerCreateAudioQuery } from "../api/talk.js";
import {
  createAudioFeature as synthesizerCreateAudioFeature,
  deleteAudioFeature,
  getAudioFeatureLength,
  getAudioQueryFrameLength,
  renderAudioFeature,
  streamingSynthesis as synthesizerStreamingSynthesis,
} from "../api/streaming.js";
import { getSynthesizerMetasJson } from "../api/voice-model.js";
import { isGpuMode as synthesizerIsGpuMode } from "../api/voicevox.js";
import { deleteSynthesizer } from "../api/voicevox.js";
import { createSynthesizer } from "../api/voicevox.js";
import {
  openVoiceModelFile,
  getVoiceModelId,
  getVoiceModelMetasJson,
  closeVoiceModelFile,
} from "../api/voice-model.js";
import type {
  AudioFeature,
  VoicevoxClient,
  VoicevoxClientOptions,
  CharacterMeta,
  CharacterMetaWithModelInfo,
} from "./types.js";
import type {
  AudioQuery,
  AudioQueryFrameLengthOptions,
  StreamingSynthesisOptions,
  SynthesisOptions,
  TtsOptions,
  Score,
  FrameAudioQuery,
  SynthesizerHandle,
} from "../types/index.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadLibrary } from "../ffi/library.js";
import { loadVoiceModel } from "../index.js";

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
  const functions = loadLibrary(options.corePath);

  // ONNX Runtimeをロード
  const onnxruntime = await loadOnnxruntime(functions, {
    filename: options.onnxruntimePath,
  });

  // OpenJTalkを初期化
  // onnxruntimeはシングルトンなので、失敗時も解放不要
  const openJtalk = await createOpenJtalk(functions, options.openJtalkDictDir);

  // シンセサイザを初期化
  let synthesizer: SynthesizerHandle;
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

  // 破棄済みフラグ（close()以降の新しい操作を拒否する）
  let disposed = false;
  // シンセサイザ等を実際に解放したか
  let released = false;
  // 実行中の非同期操作の数
  let activeOperations = 0;
  let resolveReleased: () => void = () => {};
  const releasedPromise = new Promise<void>((resolve) => {
    resolveReleased = resolve;
  });

  /**
   * 破棄済みチェック
   */
  function ensureNotDisposed(): void {
    if (disposed) {
      throw new Error("VoicevoxClient has been disposed");
    }
  }

  /**
   * 閉じられていて実行中の操作がなければ、シンセサイザとOpenJTalkを解放する
   *
   * 非同期呼び出しはWorkerのキューで待機していることがあり、C APIの破棄関数は
   * 実行中の呼び出しの完了しか待たない。解放後に待機中の呼び出しが実行されると
   * プロセスが異常終了するため、close()は即座に解放しない
   */
  function releaseIfIdle(): void {
    if (disposed && activeOperations === 0 && !released) {
      released = true;
      deleteSynthesizer(functions, synthesizer);
      deleteOpenJtalk(functions, openJtalk);
      resolveReleased();
    }
  }

  /**
   * 非同期操作を実行中として数え、完了するまでリソースの解放を遅らせる
   *
   * 複数のC API呼び出しからなる操作も、途中でclose()されたときは最後まで実行される
   */
  async function track<T>(operation: () => Promise<T>): Promise<T> {
    ensureNotDisposed();
    activeOperations++;
    try {
      return await operation();
    } finally {
      activeOperations--;
      releaseIfIdle();
    }
  }

  /**
   * クライアントオブジェクト
   */
  const client: VoicevoxClient = {
    // モデル操作

    peekModelFilesMeta(dir: string): Promise<readonly CharacterMetaWithModelInfo[]> {
      return track(async () => {
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
      });
    },

    loadVoiceModelFromPath(...paths: string[]): Promise<void> {
      return track(async () => {
        for (const path of paths) {
          const handle = await openVoiceModelFile(functions, path);
          try {
            await loadVoiceModel(functions, synthesizer, handle);
          } finally {
            closeVoiceModelFile(functions, handle);
          }
        }
      });
    },
    // 音声合成

    tts(text: string, styleId: number, options?: TtsOptions): Promise<Uint8Array> {
      return track(() => synthesizerTts(functions, synthesizer, text, styleId, options));
    },

    ttsFromKana(kana: string, styleId: number, options?: TtsOptions): Promise<Uint8Array> {
      return track(() => synthesizerTtsFromKana(functions, synthesizer, kana, styleId, options));
    },

    createAudioQuery(text: string, styleId: number): Promise<AudioQuery> {
      return track(() => synthesizerCreateAudioQuery(functions, synthesizer, text, styleId));
    },

    createAudioQueryFromKana(kana: string, styleId: number): Promise<AudioQuery> {
      return track(() =>
        synthesizerCreateAudioQueryFromKana(functions, synthesizer, kana, styleId),
      );
    },

    createAccentPhrases(text: string, styleId: number): Promise<AudioQuery["accent_phrases"]> {
      return track(() => synthesizerCreateAccentPhrases(functions, synthesizer, text, styleId));
    },

    createAccentPhrasesFromKana(
      kana: string,
      styleId: number,
    ): Promise<AudioQuery["accent_phrases"]> {
      return track(() =>
        synthesizerCreateAccentPhrasesFromKana(functions, synthesizer, kana, styleId),
      );
    },

    createAudioQueryFromAccentPhrases(
      accentPhrases: AudioQuery["accent_phrases"],
    ): Promise<AudioQuery> {
      return track(() => synthesizerCreateAudioQueryFromAccentPhrases(functions, accentPhrases));
    },

    synthesize(
      audioQuery: AudioQuery,
      styleId: number,
      options?: SynthesisOptions,
    ): Promise<Uint8Array> {
      return track(() =>
        synthesizerSynthesis(functions, synthesizer, audioQuery, styleId, options),
      );
    },

    // ストリーミング音声合成

    async *streamingSynthesis(
      audioQuery: AudioQuery,
      styleId: number,
      options?: StreamingSynthesisOptions,
    ): AsyncGenerator<Uint8Array, void, undefined> {
      ensureNotDisposed();
      // 反復中は先読みのrenderが実行中のことがあるため、反復の終了まで解放を遅らせる
      activeOperations++;
      try {
        const stream = synthesizerStreamingSynthesis(
          functions,
          synthesizer,
          audioQuery,
          styleId,
          options,
        );
        for await (const chunk of stream) {
          yield chunk;
          // 反復の途中でクライアントが閉じられた場合は、次の区間を合成せずに終了する
          ensureNotDisposed();
        }
      } finally {
        activeOperations--;
        releaseIfIdle();
      }
    },

    async createAudioFeature(
      audioQuery: AudioQuery,
      styleId: number,
      options?: SynthesisOptions,
    ): Promise<AudioFeature> {
      const handle = await track(() =>
        synthesizerCreateAudioFeature(functions, synthesizer, audioQuery, styleId, options),
      );
      const length = getAudioFeatureLength(functions, handle);

      let closed = false;
      let deleted = false;
      let pendingRenders = 0;

      /**
       * 閉じられていて生成中のrenderがなければ破棄する
       *
       * 生成中に破棄するとプロセスが異常終了するため、close()は即座に破棄しない
       */
      function releaseIfIdle(): void {
        if (closed && pendingRenders === 0 && !deleted) {
          deleted = true;
          deleteAudioFeature(functions, handle);
        }
      }

      const audioFeature: AudioFeature = {
        length,
        handle,

        async render(start?: number, end?: number): Promise<Uint8Array> {
          ensureNotDisposed();
          if (closed) {
            throw new Error("AudioFeature has been closed");
          }
          pendingRenders++;
          try {
            return await track(() =>
              renderAudioFeature(functions, synthesizer, handle, start, end),
            );
          } finally {
            pendingRenders--;
            releaseIfIdle();
          }
        },

        close() {
          closed = true;
          releaseIfIdle();
        },

        [Symbol.dispose]() {
          this.close();
        },
      };
      return audioFeature;
    },

    getAudioQueryFrameLength(
      audioQuery: AudioQuery,
      options?: AudioQueryFrameLengthOptions,
    ): number {
      ensureNotDisposed();
      return getAudioQueryFrameLength(functions, audioQuery, options);
    },

    // 歌唱音声合成

    createSingFrameAudioQuery(score: Score, styleId: number): Promise<FrameAudioQuery> {
      return track(() =>
        synthesizerCreateSingFrameAudioQuery(functions, synthesizer, score, styleId),
      );
    },

    frameSynthesize(frameAudioQuery: FrameAudioQuery, styleId: number): Promise<Uint8Array> {
      return track(() =>
        synthesizerFrameSynthesis(functions, synthesizer, frameAudioQuery, styleId),
      );
    },

    sing(score: Score, teacherStyleId: number, singerStyleId: number): Promise<Uint8Array> {
      return track(async () => {
        const frameAudioQuery = await synthesizerCreateSingFrameAudioQuery(
          functions,
          synthesizer,
          score,
          teacherStyleId,
        );
        return synthesizerFrameSynthesis(functions, synthesizer, frameAudioQuery, singerStyleId);
      });
    },

    // 情報取得

    getLoadedSpeakers(): readonly CharacterMeta[] {
      ensureNotDisposed();
      const metasJson = getSynthesizerMetasJson(functions, synthesizer);
      return JSON.parse(metasJson) as CharacterMeta[];
    },

    getVersion(): string {
      ensureNotDisposed();
      return getVersion(functions);
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
      disposed = true;
      releaseIfIdle();
    },

    [Symbol.dispose]() {
      this.close();
    },

    [Symbol.asyncDispose]() {
      this.close();
      return releasedPromise;
    },
  };

  return client;
}
