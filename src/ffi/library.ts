/**
 * ライブラリローダー
 *
 * voicevox_coreの動的ライブラリをロードする
 */

import koffi from "koffi";
import { declareFunctions, type VoicevoxCoreFunctions } from "./functions.js";

/**
 * プラットフォームに応じたデフォルトライブラリ名を取得
 */
function getDefaultLibraryName(): string {
  switch (process.platform) {
    case "darwin":
      return "libvoicevox_core.dylib";
    case "win32":
      return "voicevox_core.dll";
    default:
      return "libvoicevox_core.so";
  }
}

/**
 * ライブラリパスを取得
 *
 * 環境変数VOICEVOX_CORE_LIB_PATHが設定されていればそれを使用し、
 * 未設定の場合はプラットフォームに応じたデフォルト名を使用
 */
function getLibraryPath(): string {
  return process.env.VOICEVOX_CORE_LIB_PATH ?? getDefaultLibraryName();
}

/**
 * voicevox_coreライブラリをロードしてFFI関数を宣言する
 *
 * @returns VOICEVOX CORE FFI関数
 */
export function loadLibrary(): VoicevoxCoreFunctions {
  const libPath = getLibraryPath();
  const lib = koffi.load(libPath);
  return declareFunctions(lib);
}
