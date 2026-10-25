/**
 * OpenJTalk関連API
 */
import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import {
  allocOutPointer,
  readOutPointer,
  readCString,
  packUserDictWord,
  NULL_POINTER,
} from "../ffi/native.js";
import { VoicevoxResultCode, VoicevoxUserDictWordType } from "../types/enums.js";
import type {
  OpenJtalkHandle,
  OutJsonStringHandle,
  UserDictHandle,
  UserDictWord,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { uuidBytesToString, uuidStringToBytes } from "../utils/uuid.js";

/**
 * ユーザー辞書単語のデフォルト値
 *
 * voicevox_coreの`DEFAULT_WORD_TYPE` / `DEFAULT_PRIORITY`
 * （crates/voicevox_core/src/engine/talk/user_dict/word.rs）と同じ値
 */
const DEFAULT_WORD_TYPE = VoicevoxUserDictWordType.CommonNoun;
const DEFAULT_PRIORITY = 5;

/**
 * OpenJTalkを構築する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param dictDir - Open JTalk辞書ディレクトリのパス
 * @returns Promise<OpenJTalkハンドル>
 * @throws {VoicevoxError} 構築に失敗した場合
 */
export async function createOpenJtalk(
  functions: VoicevoxCoreFunctions,
  dictDir: string,
): Promise<OpenJtalkHandle> {
  const outOpenJtalk = allocOutPointer();
  const resultCode = await functions.voicevox_open_jtalk_rc_new.async(dictDir, outOpenJtalk);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = readOutPointer(outOpenJtalk);
  if (handle === NULL_POINTER) {
    throw new Error("Failed to create OpenJtalk: null handle returned");
  }

  return handle as OpenJtalkHandle;
}

/**
 * OpenJTalkを破棄する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param openJtalk - OpenJTalkハンドル
 */
export function deleteOpenJtalk(
  functions: VoicevoxCoreFunctions,
  openJtalk: OpenJtalkHandle,
): void {
  functions.voicevox_open_jtalk_rc_delete(openJtalk);
}

/**
 * OpenJTalkにユーザー辞書を設定する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param openJtalk - OpenJTalkハンドル
 * @param userDict - ユーザー辞書ハンドル
 * @throws {VoicevoxError} 設定に失敗した場合
 */
export function useUserDict(
  functions: VoicevoxCoreFunctions,
  openJtalk: OpenJtalkHandle,
  userDict: UserDictHandle,
): void {
  const resultCode = functions.voicevox_open_jtalk_rc_use_user_dict(openJtalk, userDict);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * 日本語テキストを解析してアクセント句の配列を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param openJtalk - OpenJTalkハンドル
 * @param text - UTF-8の日本語テキスト
 * @returns Promise<アクセント句の配列のJSON文字列>
 * @throws {VoicevoxError} 解析に失敗した場合
 */
export async function analyze(
  functions: VoicevoxCoreFunctions,
  openJtalk: OpenJtalkHandle,
  text: string,
): Promise<string> {
  const outJson = allocOutPointer();
  const resultCode = await functions.voicevox_open_jtalk_rc_analyze.async(openJtalk, text, outJson);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to analyze: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_string_free(jsonPtr);

  return jsonStr;
}

/**
 * ユーザー辞書の単語を作成
 *
 * C APIの`voicevox_user_dict_word_make`は32バイト構造体を値返しするため
 * node:ffiでは呼び出せない。同関数が設定するデフォルト値
 * （voicevox_coreの`DEFAULT_WORD_TYPE` / `DEFAULT_PRIORITY`）をJS側で再現している。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param surface - 表記
 * @param pronunciation - 読み（カタカナ）
 * @param accentType - アクセント型
 * @returns ユーザー辞書単語（デフォルト値が設定される）
 */
export function createUserDictWord(
  _functions: VoicevoxCoreFunctions,
  surface: string,
  pronunciation: string,
  accentType: number,
): UserDictWord {
  return {
    surface,
    pronunciation,
    accentType,
    wordType: DEFAULT_WORD_TYPE,
    priority: DEFAULT_PRIORITY,
  };
}

/**
 * ユーザー辞書を新規作成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @returns ユーザー辞書ハンドル
 */
export function createUserDict(functions: VoicevoxCoreFunctions): UserDictHandle {
  return functions.voicevox_user_dict_new();
}

/**
 * ユーザー辞書をファイルから読み込む
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param dictPath - 辞書ファイルのパス
 * @throws {VoicevoxError} 読み込みに失敗した場合
 */
export function loadUserDict(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  dictPath: string,
): void {
  const resultCode = functions.voicevox_user_dict_load(userDict, dictPath);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ユーザー辞書に単語を追加
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param word - 追加する単語
 * @returns 追加した単語のUUID（文字列）
 * @throws {VoicevoxError} 追加に失敗した場合
 */
export function addUserDictWord(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  word: UserDictWord,
): string {
  // packed.keepAliveの文字列Bufferは同期呼び出し完了までこのスコープで生存する
  const packed = packUserDictWord(word);

  const outUuid = new Uint8Array(16);
  const resultCode = functions.voicevox_user_dict_add_word(userDict, packed.struct, outUuid);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  return uuidBytesToString(outUuid);
}

/**
 * ユーザー辞書の単語を更新
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param wordUuid - 更新する単語のUUID（文字列）
 * @param word - 新しい単語データ
 * @throws {VoicevoxError} 更新に失敗した場合
 */
export function updateUserDictWord(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  wordUuid: string,
  word: UserDictWord,
): void {
  // packed.keepAliveの文字列Bufferは同期呼び出し完了までこのスコープで生存する
  const packed = packUserDictWord(word);

  const uuidBytes = uuidStringToBytes(wordUuid);
  const resultCode = functions.voicevox_user_dict_update_word(userDict, uuidBytes, packed.struct);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ユーザー辞書から単語を削除
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param wordUuid - 削除する単語のUUID（文字列）
 * @throws {VoicevoxError} 削除に失敗した場合
 */
export function removeUserDictWord(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  wordUuid: string,
): void {
  const uuidBytes = uuidStringToBytes(wordUuid);
  const resultCode = functions.voicevox_user_dict_remove_word(userDict, uuidBytes);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ユーザー辞書をJSON形式で出力
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @returns JSON文字列
 * @throws {VoicevoxError} 出力に失敗した場合
 */
export function userDictToJson(functions: VoicevoxCoreFunctions, userDict: UserDictHandle): string {
  const outJson = allocOutPointer();
  const resultCode = functions.voicevox_user_dict_to_json(userDict, outJson);

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

  return jsonStr;
}

/**
 * 他のユーザー辞書をインポート
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param otherDict - インポートするユーザー辞書ハンドル
 * @throws {VoicevoxError} インポートに失敗した場合
 */
export function importUserDict(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  otherDict: UserDictHandle,
): void {
  const resultCode = functions.voicevox_user_dict_import(userDict, otherDict);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ユーザー辞書をファイルに保存
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 * @param path - 保存先のファイルパス
 * @throws {VoicevoxError} 保存に失敗した場合
 */
export function saveUserDict(
  functions: VoicevoxCoreFunctions,
  userDict: UserDictHandle,
  path: string,
): void {
  const resultCode = functions.voicevox_user_dict_save(userDict, path);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * ユーザー辞書を破棄
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param userDict - ユーザー辞書ハンドル
 */
export function deleteUserDict(functions: VoicevoxCoreFunctions, userDict: UserDictHandle): void {
  functions.voicevox_user_dict_delete(userDict);
}
