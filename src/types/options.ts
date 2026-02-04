/**
 * オプション型定義
 */

import type { VoicevoxAccelerationMode } from "./enums.js";

/**
 * ONNX Runtimeロードオプション
 */
export interface LoadOnnxruntimeOptions {
	/**
	 * ONNX Runtimeのファイル名またはパス
	 *
	 * 未指定の場合はデフォルトのファイル名が使用される
	 */
	filename?: string;
}

/**
 * 初期化オプション
 */
export interface InitializeOptions {
	/**
	 * ハードウェアアクセラレーションモード
	 *
	 * @defaultValue `VoicevoxAccelerationMode.Auto`
	 */
	accelerationMode?: VoicevoxAccelerationMode;

	/**
	 * CPU利用数
	 *
	 * 0を指定すると環境に合わせたCPUが利用される
	 *
	 * @defaultValue 0 (自動)
	 */
	cpuNumThreads?: number;
}

/**
 * 音声合成オプション
 */
export interface SynthesisOptions {
	/**
	 * 疑問文の調整を有効にする
	 *
	 * @defaultValue true
	 */
	enableInterrogativeUpspeak?: boolean;
}

/**
 * TTSオプション
 */
export interface TtsOptions {
	/**
	 * 疑問文の調整を有効にする
	 *
	 * @defaultValue true
	 */
	enableInterrogativeUpspeak?: boolean;
}
