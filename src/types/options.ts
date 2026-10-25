/**
 * オプション型定義
 */

import type { VoicevoxAccelerationMode, VoicevoxOnExistingVoiceModelId } from "./enums.js";

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
 * 音声モデルのロードオプション
 */
export interface LoadVoiceModelOptions {
  /**
   * 同じIDの音声モデルが既に読み込まれていたときのふるまい
   *
   * @defaultValue `VoicevoxOnExistingVoiceModelId.Error`
   */
  onExisting?: VoicevoxOnExistingVoiceModelId;
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

/**
 * AudioQueryの総フレーム数算出オプション
 */
export interface AudioQueryFrameLengthOptions {
  /**
   * 疑問文の調整を考慮する
   *
   * @defaultValue true
   */
  enableInterrogativeUpspeak?: boolean;
}

/**
 * ストリーミング音声合成オプション
 */
export interface StreamingSynthesisOptions extends SynthesisOptions {
  /**
   * 音声合成を開始する位置（秒）
   *
   * フレーム数に換算した値が音声の総フレーム数以下の非負数でなければならない
   *
   * @defaultValue 0
   */
  startOffsetInSecs?: number;

  /**
   * 一度に生成する音声の長さ（秒）
   *
   * フレーム数に換算して1フレーム以上でなければならない
   *
   * @defaultValue 0.3
   */
  segmentLengthInSecs?: number;
}
