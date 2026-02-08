/**
 * 高レベルAPIの型定義
 */

import type {
  InitializeOptions,
  OnnxruntimeHandle,
  OpenJtalkHandle,
  SynthesizerHandle,
  SynthesisOptions,
  TtsOptions,
  VoiceModelFileHandle,
} from "../types/index.js";
import type { AudioQuery } from "../types/models.js";
import type { VoicevoxCoreFunctions } from "../ffi/functions.js";

/**
 * スピーカーのスタイル情報
 */
export interface SpeakerStyle {
  readonly name: string;
  readonly id: number;
  readonly type?: string;
}

/**
 * スピーカーのメタ情報
 */
export interface SpeakerMeta {
  readonly name: string;
  readonly speaker_uuid: string;
  readonly styles: readonly SpeakerStyle[];
  readonly version?: string;
}

/**
 * クライアント初期化オプション
 */
export interface VoicevoxClientOptions {
  /**
   * voicevox_core DLLのパス (必須)
   *
   * @example "./voicevox/libvoicevox_core.dylib"
   */
  corePath: string;

  /**
   * ONNX Runtimeのパス
   *
   * 省略時はC APIのデフォルト動作に従う
   */
  onnxruntimePath?: string;

  /**
   * OpenJTalk辞書ディレクトリのパス (必須)
   *
   * @example "./voicevox/dict/open_jtalk_dic_utf_8-1.11"
   */
  openJtalkDictDir: string;

  /**
   * 初期化オプション
   */
  initializeOptions?: InitializeOptions;
}

/**
 * 開いたモデルファイル
 *
 * `using` 宣言で使用可能
 */
export interface VoicevoxModelFile extends Disposable {
  /**
   * モデルに含まれるスピーカーのメタ情報
   */
  readonly metas: readonly SpeakerMeta[];

  /**
   * モデルファイルのID (16バイトのUUID)
   */
  readonly id: Uint8Array;

  /**
   * 低レベルAPI連携用のハンドル
   */
  readonly handle: VoiceModelFileHandle;

  /**
   * モデルファイルを閉じる
   *
   * 冪等性が保証されており、複数回呼び出しても安全
   */
  close(): void;
}

/**
 * クライアントオブジェクト
 *
 * `using` 宣言で使用可能
 */
export interface VoicevoxClient extends Disposable {
  // モデル操作

  /**
   * モデルファイルを開く
   *
   * @param path - モデルファイル (.vvm) のパス
   * @returns 開いたモデルファイル
   */
  openModelFile(path: string): Promise<VoicevoxModelFile>;

  /**
   * モデルをロードする
   *
   * @param modelFile - ロードするモデルファイル
   */
  loadModel(modelFile: VoicevoxModelFile): Promise<void>;

  /**
   * 複数のモデルをロードする
   *
   * @param modelFiles - ロードするモデルファイルの配列
   */
  loadModels(modelFiles: readonly VoicevoxModelFile[]): Promise<void>;

  // 音声合成

  /**
   * テキストから音声を生成する
   *
   * @param text - 音声化するテキスト
   * @param styleId - スタイルID
   * @param options - TTSオプション
   * @returns WAV形式の音声データ
   */
  tts(
    text: string,
    styleId: number,
    options?: TtsOptions,
  ): Promise<Uint8Array>;

  /**
   * AudioQueryを作成する
   *
   * @param text - 音声化するテキスト
   * @param styleId - スタイルID
   * @returns AudioQuery
   */
  createAudioQuery(text: string, styleId: number): Promise<AudioQuery>;

  /**
   * AudioQueryから音声を合成する
   *
   * @param audioQuery - AudioQuery
   * @param styleId - スタイルID
   * @param options - 合成オプション
   * @returns WAV形式の音声データ
   */
  synthesize(
    audioQuery: AudioQuery,
    styleId: number,
    options?: SynthesisOptions,
  ): Promise<Uint8Array>;

  // 情報取得

  /**
   * ロード済みのスピーカー情報を取得する
   *
   * @returns スピーカーメタ情報の配列
   */
  getLoadedSpeakers(): readonly SpeakerMeta[];

  /**
   * VOICEVOXのバージョンを取得する
   *
   * @returns バージョン文字列
   */
  getVersion(): string;

  /**
   * GPUモードが有効かどうか
   */
  readonly isGpuMode: boolean;

  // 低レベルAPI連携

  /**
   * 低レベルAPI関数オブジェクト
   */
  readonly functions: VoicevoxCoreFunctions;

  /**
   * シンセサイザハンドル
   */
  readonly synthesizerHandle: SynthesizerHandle;

  /**
   * ONNX Runtimeハンドル
   *
   * @internal
   */
  readonly onnxruntimeHandle: OnnxruntimeHandle;

  /**
   * OpenJTalkハンドル
   *
   * @internal
   */
  readonly openJtalkHandle: OpenJtalkHandle;

  // リソース管理

  /**
   * クライアントを閉じる
   *
   * 冪等性が保証されており、複数回呼び出しても安全
   */
  close(): void;
}
