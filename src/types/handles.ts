/**
 * ハンドル型定義
 *
 * C APIの不透明ポインタを型安全に扱うためのブランド型
 */

declare const OnnxruntimeHandleBrand: unique symbol;
declare const OpenJtalkHandleBrand: unique symbol;
declare const SynthesizerHandleBrand: unique symbol;
declare const VoiceModelFileHandleBrand: unique symbol;
declare const UserDictHandleBrand: unique symbol;
declare const OutJsonStringHandleBrand: unique symbol;
declare const OutWavDataHandleBrand: unique symbol;

/**
 * ONNX Runtimeハンドル
 *
 * シングルトンインスタンスへの参照
 */
export type OnnxruntimeHandle = {
  readonly [OnnxruntimeHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * OpenJTalkハンドル
 *
 * テキスト解析器への参照
 */
export type OpenJtalkHandle = {
  readonly [OpenJtalkHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * シンセサイザハンドル
 *
 * 音声シンセサイザへの参照
 */
export type SynthesizerHandle = {
  readonly [SynthesizerHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * 音声モデルファイルハンドル
 *
 * VVMファイルへの参照
 */
export type VoiceModelFileHandle = {
  readonly [VoiceModelFileHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * ユーザー辞書ハンドル
 *
 * ユーザー辞書への参照
 */
export type UserDictHandle = {
  readonly [UserDictHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * JSON文字列出力ハンドル
 *
 * C APIの関数から出力されるJSON文字列ポインタ
 * voicevox_json_freeで解放する必要がある
 */
export type OutJsonStringHandle = {
  readonly [OutJsonStringHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};

/**
 * WAVデータ出力ハンドル
 *
 * C APIの関数から出力されるWAVデータポインタ
 * voicevox_wav_freeで解放する必要がある
 */
export type OutWavDataHandle = {
  readonly [OutWavDataHandleBrand]: never;
  /** @internal */
  readonly _ptr: unknown;
};
