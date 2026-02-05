/**
 * OpenJTalk関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { OpenJtalkHandle } from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";

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
  const outOpenJtalk: [any] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_open_jtalk_rc_new,
    dictDir,
    outOpenJtalk,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const handle = outOpenJtalk[0];
  if (handle == null) {
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
