/**
 * ライブラリローダー
 *
 * voicevox_coreの動的ライブラリをロードする
 */

import koffi from "koffi";

let library: koffi.IKoffiLib | null = null;

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
 * voicevox_coreライブラリをロードする
 *
 * 一度ロードされたライブラリはキャッシュされ、再度呼び出しても同じインスタンスが返される
 *
 * @returns koffiライブラリインスタンス
 */
export function loadLibrary(): koffi.IKoffiLib {
  if (library) {
    return library;
  }

  const libPath = getLibraryPath();
  library = koffi.load(libPath);

  return library;
}

/**
 * ライブラリをアンロードする
 *
 * テストなどで必要な場合のみ使用すること
 */
export function unloadLibrary(): void {
  library = null;
}
