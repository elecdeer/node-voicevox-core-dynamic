/**
 * OpenJTalk関連API
 */

import { loadLibrary } from "../ffi/library.js";
import { declareFunctions } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { OpenJtalkHandle } from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";

let cachedFunctions: ReturnType<typeof declareFunctions> | null = null;

/**
 * FFI関数を取得（キャッシュ）
 */
function getFunctions() {
	if (!cachedFunctions) {
		const lib = loadLibrary();
		cachedFunctions = declareFunctions(lib);
	}
	return cachedFunctions;
}

/**
 * OpenJTalkを構築する
 *
 * @param dictDir - Open JTalk辞書ディレクトリのパス
 * @returns OpenJTalkハンドル
 * @throws {VoicevoxError} 構築に失敗した場合
 */
export function createOpenJtalk(dictDir: string): OpenJtalkHandle {
	const functions = getFunctions();

	const outOpenJtalk = [null];
	const resultCode = functions.voicevox_open_jtalk_rc_new(
		dictDir,
		outOpenJtalk,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
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
 * @param openJtalk - OpenJTalkハンドル
 */
export function deleteOpenJtalk(openJtalk: OpenJtalkHandle): void {
	const functions = getFunctions();
	functions.voicevox_open_jtalk_rc_delete(openJtalk);
}
