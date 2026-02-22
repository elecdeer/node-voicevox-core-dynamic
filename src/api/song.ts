/**
 * シンセサイザ関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  SynthesizerHandle,
  OutJsonStringHandle,
  OutWavDataHandle,
  Score,
  FrameAudioQuery,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import koffi from "koffi";

/**
 * 楽譜からFrameAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param styleId - スタイルID
 * @returns Promise<FrameAudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameAudioQuery(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  styleId: number,
): Promise<FrameAudioQuery> {
  if (!functions.voicevox_synthesizer_create_sing_frame_audio_query) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_audio_query is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_audio_query,
    synthesizer,
    scoreJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

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
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameF0(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  if (!functions.voicevox_synthesizer_create_sing_frame_f0) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_f0 is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_f0,
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

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

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
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameVolume(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  if (!functions.voicevox_synthesizer_create_sing_frame_volume) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_volume is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_volume,
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

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as number[];
}

/**
 * FrameAudioQueryから歌唱音声を合成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function frameSynthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<Uint8Array> {
  if (!functions.voicevox_synthesizer_frame_synthesis) {
    throw new Error(
      "voicevox_synthesizer_frame_synthesis is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_frame_synthesis,
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

  const wavPtr = outWav[0];
  if (wavPtr == null) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  functions.voicevox_wav_free(wavPtr);

  return wavData;
}
