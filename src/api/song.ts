/**
 * シンセサイザ関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import {
  allocOutPointer,
  readOutPointer,
  readOutSize,
  readCString,
  readBytes,
  NULL_POINTER,
} from "../ffi/native.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  SynthesizerHandle,
  OutJsonStringHandle,
  OutBytesHandle,
  Score,
  FrameAudioQuery,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";

/**
 * 楽譜からFrameAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param styleId - スタイルID
 * @returns Promise<FrameAudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createSingFrameAudioQuery(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  styleId: number,
): Promise<FrameAudioQuery> {
  const scoreJson = JSON.stringify(score);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_sing_frame_audio_query.async(
    synthesizer,
    scoreJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_string_free(jsonPtr);

  return JSON.parse(jsonStr) as FrameAudioQuery;
}

/**
 * フレームごとの基本周波数を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @returns Promise<number[]> フレームごとの基本周波数
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createSingFrameF0(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_sing_frame_f0.async(
    synthesizer,
    scoreJson,
    frameAudioQueryJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_string_free(jsonPtr);

  return JSON.parse(jsonStr) as number[];
}

/**
 * フレームごとの音量を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @returns Promise<number[]> フレームごとの音量
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createSingFrameVolume(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_sing_frame_volume.async(
    synthesizer,
    scoreJson,
    frameAudioQueryJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_string_free(jsonPtr);

  return JSON.parse(jsonStr) as number[];
}

/**
 * FrameAudioQueryから歌唱音声を合成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function frameSynthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<Uint8Array> {
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outLength = allocOutPointer();
  const outWav = allocOutPointer();

  const resultCode = await functions.voicevox_synthesizer_frame_synthesis.async(
    synthesizer,
    frameAudioQueryJson,
    styleId,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = readOutPointer(outWav) as OutBytesHandle;
  if (wavPtr === NULL_POINTER) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  // WAVデータをコピーしてからC側のメモリを解放する
  const wavData = readBytes(wavPtr, readOutSize(outLength));
  functions.voicevox_bytes_free(wavPtr);

  return wavData;
}
