/**
 * ハンドル型定義
 *
 * C APIの不透明ポインタを型安全に扱うためのブランド型
 */

declare const OnnxruntimeHandleBrand: unique symbol;
declare const OpenJtalkHandleBrand: unique symbol;
declare const SynthesizerHandleBrand: unique symbol;
declare const VoiceModelFileHandleBrand: unique symbol;

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
