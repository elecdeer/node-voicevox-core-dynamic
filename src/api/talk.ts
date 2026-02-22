import koffi from "koffi";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { type VoicevoxCoreFunctions, promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { SynthesizerHandle, OutJsonStringHandle, OutWavDataHandle } from "../types/handles.js";
import type { AudioQuery } from "../types/models.js";
import type { SynthesisOptions, TtsOptions } from "../types/options.js";

/**
 * 日本語テキストからAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */

export async function createAudioQuery(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
): Promise<AudioQuery> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_audio_query,
    synthesizer,
    text,
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

  // void*から文字列を取得する
  // lenに-1を指定することで、null終端文字列として自動的に長さを検出
  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;

  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * カナ（AquesTalk風記法）からAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAudioQueryFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
): Promise<AudioQuery> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_audio_query_from_kana,
    synthesizer,
    kana,
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

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * テキストからアクセント句を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAccentPhrases(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_accent_phrases,
    synthesizer,
    text,
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

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * カナ（AquesTalk風記法）からアクセント句を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAccentPhrasesFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_accent_phrases_from_kana,
    synthesizer,
    kana,
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

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * アクセント句からAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param accentPhrases - アクセント句の配列
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAudioQueryFromAccentPhrases(
  functions: VoicevoxCoreFunctions,
  accentPhrases: AudioQuery["accent_phrases"],
): Promise<AudioQuery> {
  const accentPhrasesJson = JSON.stringify(accentPhrases);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_audio_query_create_from_accent_phrases,
    accentPhrasesJson,
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

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * AudioQueryから音声合成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param audioQuery - AudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function synthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  audioQuery: AudioQuery,
  styleId: number,
  options?: SynthesisOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_synthesis_options();

  const synthesisOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const audioQueryJson = JSON.stringify(audioQuery);
  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_synthesis,
    synthesizer,
    audioQueryJson,
    styleId,
    synthesisOptions,
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

/**
 * テキストから直接音声合成 (TTS)
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @param options - TTSオプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function tts(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
  options?: TtsOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_tts_options();

  const ttsOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_tts,
    synthesizer,
    text,
    styleId,
    ttsOptions,
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

/**
 * カナ（AquesTalk風記法）から直接音声合成 (TTS)
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @param options - TTSオプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function ttsFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
  options?: TtsOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_tts_options();

  const ttsOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_tts_from_kana,
    synthesizer,
    kana,
    styleId,
    ttsOptions,
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
