/**
 * ライブラリローダー
 *
 * voicevox_coreの動的ライブラリをロードする
 */

import koffi from "koffi";
import { declareFunctions, type VoicevoxCoreFunctions } from "./functions.js";

/**
 * voicevox_coreライブラリをロードしてFFI関数を宣言する
 *
 * @returns VOICEVOX CORE FFI関数
 */
export function loadLibrary(libPath: string): VoicevoxCoreFunctions {
  const lib = koffi.load(libPath);
  return declareFunctions(lib);
}
