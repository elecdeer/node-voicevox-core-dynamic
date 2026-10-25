/**
 * ハンドル型定義
 *
 * C APIの不透明ポインタを型安全に扱うためのブランド型
 *
 * 実体はnode:ffiが返す生ポインタアドレス（bigint）。NULLは`0n`で表される。
 */

declare const OnnxruntimeHandleBrand: unique symbol;
declare const OpenJtalkHandleBrand: unique symbol;
declare const SynthesizerHandleBrand: unique symbol;
declare const VoiceModelFileHandleBrand: unique symbol;
declare const UserDictHandleBrand: unique symbol;
declare const AudioFeatureHandleBrand: unique symbol;
declare const OutJsonStringHandleBrand: unique symbol;
declare const OutBytesHandleBrand: unique symbol;

/**
 * ONNX Runtimeハンドル
 *
 * シングルトンインスタンスへの参照
 */
export type OnnxruntimeHandle = bigint & {
  readonly [OnnxruntimeHandleBrand]: never;
};

/**
 * OpenJTalkハンドル
 *
 * テキスト解析器への参照
 */
export type OpenJtalkHandle = bigint & {
  readonly [OpenJtalkHandleBrand]: never;
};

/**
 * シンセサイザハンドル
 *
 * 音声シンセサイザへの参照
 */
export type SynthesizerHandle = bigint & {
  readonly [SynthesizerHandleBrand]: never;
};

/**
 * 音声モデルファイルハンドル
 *
 * VVMファイルへの参照
 */
export type VoiceModelFileHandle = bigint & {
  readonly [VoiceModelFileHandleBrand]: never;
};

/**
 * ユーザー辞書ハンドル
 *
 * ユーザー辞書への参照
 */
export type UserDictHandle = bigint & {
  readonly [UserDictHandleBrand]: never;
};

/**
 * 音声合成用の中間表現ハンドル
 *
 * ストリーミング音声合成で使う`VoicevoxAudioFeature`への参照。
 * voicevox_audio_feature_deleteで破棄する必要がある
 */
export type AudioFeatureHandle = bigint & {
  readonly [AudioFeatureHandleBrand]: never;
};

/**
 * JSON文字列出力ハンドル
 *
 * C APIの関数から出力されるJSON文字列ポインタ
 * voicevox_string_freeで解放する必要がある
 */
export type OutJsonStringHandle = bigint & {
  readonly [OutJsonStringHandleBrand]: never;
};

/**
 * バイト列出力ハンドル
 *
 * C APIの関数から出力されるWAV/PCMデータポインタ
 * voicevox_bytes_freeで解放する必要がある
 */
export type OutBytesHandle = bigint & {
  readonly [OutBytesHandleBrand]: never;
};
