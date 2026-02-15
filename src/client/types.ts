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
 * モデルファイル情報を含むスピーカーメタ情報
 */
export interface SpeakerMetaWithModelInfo extends SpeakerMeta {
  /**
   * モデルファイルのパス
   */
  readonly modelFilePath: string;

  /**
   * モデルファイルのID (16バイトのUUID)
   */
  readonly modelId: Uint8Array;
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
 * クライアントオブジェクト
 *
 * `using` 宣言で使用可能
 */
export interface VoicevoxClient extends Disposable {
  // モデル操作

  /**
   * ディレクトリ内のモデルファイルのメタ情報を取得する
   *
   * ディレクトリ直下の `.vvm` ファイルを読み込み、各スピーカーのメタ情報を取得します。
   * 各スピーカーにモデルファイルのパスとIDが含まれます。
   *
   * @param dir - モデルファイルが格納されているディレクトリ
   * @returns スピーカーメタ情報の配列（スピーカーごとにフラット化）
   */
  peekModelFilesMeta(dir: string): Promise<readonly SpeakerMetaWithModelInfo[]>;

  /**
   * パスからモデルをロードする
   *
   * 指定されたパスのモデルファイルをシンセサイザにロードします。
   * 内部でファイルを開き、ロード後に自動的に閉じます。
   *
   * @param paths - ロードするモデルファイルのパス
   */
  loadVoiceModelFromPath(...paths: string[]): Promise<void>;

  // 音声合成

  /**
   * テキストから音声を生成する
   *
   * @param text - 音声化するテキスト
   * @param styleId - スタイルID
   * @param options - TTSオプション
   * @returns WAV形式の音声データ
   */
  tts(text: string, styleId: number, options?: TtsOptions): Promise<Uint8Array>;

  /**
   * カナ（AquesTalk風記法）から音声を生成する
   *
   * @param kana - AquesTalk風記法のカナ
   * @param styleId - スタイルID
   * @param options - TTSオプション
   * @returns WAV形式の音声データ
   */
  ttsFromKana(kana: string, styleId: number, options?: TtsOptions): Promise<Uint8Array>;

  /**
   * AudioQueryを作成する
   *
   * @param text - 音声化するテキスト
   * @param styleId - スタイルID
   * @returns AudioQuery
   */
  createAudioQuery(text: string, styleId: number): Promise<AudioQuery>;

  /**
   * カナ（AquesTalk風記法）からAudioQueryを作成する
   *
   * @param kana - AquesTalk風記法のカナ
   * @param styleId - スタイルID
   * @returns AudioQuery
   */
  createAudioQueryFromKana(kana: string, styleId: number): Promise<AudioQuery>;

  /**
   * テキストからアクセント句を生成する
   *
   * @param text - 音声化するテキスト
   * @param styleId - スタイルID
   * @returns アクセント句の配列
   */
  createAccentPhrases(text: string, styleId: number): Promise<AudioQuery["accent_phrases"]>;

  /**
   * カナ（AquesTalk風記法）からアクセント句を生成する
   *
   * @param kana - AquesTalk風記法のカナ
   * @param styleId - スタイルID
   * @returns アクセント句の配列
   */
  createAccentPhrasesFromKana(kana: string, styleId: number): Promise<AudioQuery["accent_phrases"]>;

  /**
   * アクセント句からAudioQueryを生成する
   *
   * @param accentPhrases - アクセント句の配列
   * @returns AudioQuery
   */
  createAudioQueryFromAccentPhrases(
    accentPhrases: AudioQuery["accent_phrases"],
  ): Promise<AudioQuery>;

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
