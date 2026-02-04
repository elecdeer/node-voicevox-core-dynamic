/**
 * VOICEVOXエラークラス
 */

import type { VoicevoxResultCode } from "../types/enums.js";

/**
 * VOICEVOXエラー
 *
 * voicevox_core C APIの処理でエラーが発生した場合にスローされる
 */
export class VoicevoxError extends Error {
	/**
	 * 結果コード
	 */
	readonly code: VoicevoxResultCode;

	/**
	 * VOICEVOXエラーを生成
	 *
	 * @param code - 結果コード
	 * @param message - エラーメッセージ
	 */
	constructor(code: VoicevoxResultCode, message: string) {
		super(message);
		this.name = "VoicevoxError";
		this.code = code;

		// スタックトレースを正しく表示するための処理
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, VoicevoxError);
		}
	}

	/**
	 * エラーを文字列表現にする
	 */
	override toString(): string {
		return `${this.name} [${this.code}]: ${this.message}`;
	}
}
