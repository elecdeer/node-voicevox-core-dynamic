/**
 * メモリ解放ヘルパー
 *
 * voicevox_coreから返されるポインタを適切に解放する
 */

import type { IKoffiLib } from "koffi";

/**
 * JSON文字列を解放する
 *
 * voicevox_coreが返すJSON文字列は専用の解放関数で解放する必要がある
 *
 * @param lib - koffiライブラリインスタンス
 * @param jsonPtr - JSON文字列ポインタ
 */
export function freeJson(lib: IKoffiLib, jsonPtr: unknown): void {
	if (jsonPtr == null) {
		return;
	}

	const voicevox_json_free = lib.func("void voicevox_json_free(char *json)");
	voicevox_json_free(jsonPtr);
}

/**
 * WAVデータを解放する
 *
 * voicevox_coreが返すWAVデータは専用の解放関数で解放する必要がある
 *
 * @param lib - koffiライブラリインスタンス
 * @param wavPtr - WAVデータポインタ
 */
export function freeWav(lib: IKoffiLib, wavPtr: unknown): void {
	if (wavPtr == null) {
		return;
	}

	const voicevox_wav_free = lib.func("void voicevox_wav_free(uint8 *wav)");
	voicevox_wav_free(wavPtr);
}
