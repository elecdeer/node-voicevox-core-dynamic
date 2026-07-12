/**
 * ライブラリローダー
 *
 * voicevox_coreの動的ライブラリをロードする
 */

import { declareFunctions, type VoicevoxCoreFunctions } from "./functions.js";
import { getNodeFfi } from "./native.js";

/**
 * voicevox_coreライブラリをロードしてFFI関数を宣言する
 *
 * @returns VOICEVOX CORE FFI関数
 * @throws {Error} node:ffiが利用できない場合（Node.js >= 26.1.0 + `--experimental-ffi`が必要）
 */
export function loadLibrary(libPath: string): VoicevoxCoreFunctions {
  const ffi = getNodeFfi();
  const lib = new ffi.DynamicLibrary(libPath);
  return declareFunctions(lib, libPath);
}
