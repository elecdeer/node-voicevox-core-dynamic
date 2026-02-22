/**
 * バリデーション関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import { VoicevoxError } from "../errors/voicevox-error.js";

/**
 * AudioQueryのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param audioQueryJson - AudioQueryのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 */
export function validateAudioQuery(
  functions: VoicevoxCoreFunctions,
  audioQueryJson: string,
): void {
  const resultCode = functions.voicevox_audio_query_validate(audioQueryJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * AccentPhraseのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param accentPhraseJson - AccentPhraseのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 */
export function validateAccentPhrase(
  functions: VoicevoxCoreFunctions,
  accentPhraseJson: string,
): void {
  const resultCode = functions.voicevox_accent_phrase_validate(accentPhraseJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * MoraのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param moraJson - MoraのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 */
export function validateMora(functions: VoicevoxCoreFunctions, moraJson: string): void {
  const resultCode = functions.voicevox_mora_validate(moraJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ScoreのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param scoreJson - ScoreのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 * @throws {Error} 関数が利用できない場合
 */
export function validateScore(functions: VoicevoxCoreFunctions, scoreJson: string): void {
  if (!functions.voicevox_score_validate) {
    throw new Error("voicevox_score_validate is not available in this version of voicevox_core");
  }

  const resultCode = functions.voicevox_score_validate(scoreJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * NoteのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param noteJson - NoteのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 * @throws {Error} 関数が利用できない場合
 */
export function validateNote(functions: VoicevoxCoreFunctions, noteJson: string): void {
  if (!functions.voicevox_note_validate) {
    throw new Error("voicevox_note_validate is not available in this version of voicevox_core");
  }

  const resultCode = functions.voicevox_note_validate(noteJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * FrameAudioQueryのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param frameAudioQueryJson - FrameAudioQueryのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 * @throws {Error} 関数が利用できない場合
 */
export function validateFrameAudioQuery(
  functions: VoicevoxCoreFunctions,
  frameAudioQueryJson: string,
): void {
  if (!functions.voicevox_frame_audio_query_validate) {
    throw new Error(
      "voicevox_frame_audio_query_validate is not available in this version of voicevox_core",
    );
  }

  const resultCode = functions.voicevox_frame_audio_query_validate(frameAudioQueryJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * FramePhonemeのJSONをバリデーション
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param framePhonemeJson - FramePhonemeのJSON文字列
 * @throws {VoicevoxError} バリデーションに失敗した場合
 * @throws {Error} 関数が利用できない場合
 */
export function validateFramePhoneme(
  functions: VoicevoxCoreFunctions,
  framePhonemeJson: string,
): void {
  if (!functions.voicevox_frame_phoneme_validate) {
    throw new Error(
      "voicevox_frame_phoneme_validate is not available in this version of voicevox_core",
    );
  }

  const resultCode = functions.voicevox_frame_phoneme_validate(framePhonemeJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * 楽譜とFrameAudioQueryの互換性をチェック
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param scoreJson - ScoreのJSON文字列
 * @param frameAudioQueryJson - FrameAudioQueryのJSON文字列
 * @throws {VoicevoxError} 互換性チェックに失敗した場合
 * @throws {Error} 関数が利用できない場合
 */
export function ensureCompatible(
  functions: VoicevoxCoreFunctions,
  scoreJson: string,
  frameAudioQueryJson: string,
): void {
  if (!functions.voicevox_ensure_compatible) {
    throw new Error("voicevox_ensure_compatible is not available in this version of voicevox_core");
  }

  const resultCode = functions.voicevox_ensure_compatible(scoreJson, frameAudioQueryJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}
