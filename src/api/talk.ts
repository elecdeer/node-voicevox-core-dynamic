import { VoicevoxError } from "../errors/voicevox-error.js";
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
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_audio_query.async(
    synthesizer,
    text,
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
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_audio_query_from_kana.async(
    synthesizer,
    kana,
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
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_accent_phrases.async(
    synthesizer,
    text,
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
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_accent_phrases_from_kana.async(
    synthesizer,
    kana,
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
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_audio_query_create_from_accent_phrases.async(
    accentPhrasesJson,
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
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ?? functions.voicevox_make_default_synthesis_options();

  const audioQueryJson = JSON.stringify(audioQuery);
  const outLength = allocOutPointer();
  const outWav = allocOutPointer();

  const resultCode = await functions.voicevox_synthesizer_synthesis.async(
    synthesizer,
    audioQueryJson,
    styleId,
    enableInterrogativeUpspeak,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = readOutPointer(outWav) as OutWavDataHandle;
  if (wavPtr === NULL_POINTER) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  // WAVデータをコピーしてからC側のメモリを解放する
  const wavData = readBytes(wavPtr, readOutSize(outLength));
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
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ?? functions.voicevox_make_default_tts_options();

  const outLength = allocOutPointer();
  const outWav = allocOutPointer();

  const resultCode = await functions.voicevox_synthesizer_tts.async(
    synthesizer,
    text,
    styleId,
    enableInterrogativeUpspeak,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = readOutPointer(outWav) as OutWavDataHandle;
  if (wavPtr === NULL_POINTER) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  // WAVデータをコピーしてからC側のメモリを解放する
  const wavData = readBytes(wavPtr, readOutSize(outLength));
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
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ?? functions.voicevox_make_default_tts_options();

  const outLength = allocOutPointer();
  const outWav = allocOutPointer();

  const resultCode = await functions.voicevox_synthesizer_tts_from_kana.async(
    synthesizer,
    kana,
    styleId,
    enableInterrogativeUpspeak,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = readOutPointer(outWav) as OutWavDataHandle;
  if (wavPtr === NULL_POINTER) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  // WAVデータをコピーしてからC側のメモリを解放する
  const wavData = readBytes(wavPtr, readOutSize(outLength));
  functions.voicevox_wav_free(wavPtr);

  return wavData;
}

/**
 * AccentPhraseの配列のモーラデータを生成し直す
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param accentPhrases - アクセント句の配列
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function replaceMoraData(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  accentPhrases: AudioQuery["accent_phrases"],
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const accentPhrasesJson = JSON.stringify(accentPhrases);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_replace_mora_data.async(
    synthesizer,
    accentPhrasesJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to replace mora data: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * AccentPhraseの配列の音素長を生成し直す
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param accentPhrases - アクセント句の配列
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function replacePhonemeLength(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  accentPhrases: AudioQuery["accent_phrases"],
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const accentPhrasesJson = JSON.stringify(accentPhrases);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_replace_phoneme_length.async(
    synthesizer,
    accentPhrasesJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to replace phoneme length: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * AccentPhraseの配列の音高を生成し直す
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param accentPhrases - アクセント句の配列
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function replaceMoraPitch(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  accentPhrases: AudioQuery["accent_phrases"],
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const accentPhrasesJson = JSON.stringify(accentPhrases);
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_replace_mora_pitch.async(
    synthesizer,
    accentPhrasesJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to replace mora pitch: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}
