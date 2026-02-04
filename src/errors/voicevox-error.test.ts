/**
 * VoicevoxErrorのテスト
 */

import { describe, it, expect } from "vitest";
import { VoicevoxError } from "./voicevox-error.js";
import { VoicevoxResultCode } from "../types/enums.js";

describe("VoicevoxError", () => {
	it("should create error with code and message", () => {
		const error = new VoicevoxError(
			VoicevoxResultCode.GpuSupportError,
			"GPU is not supported",
		);

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(VoicevoxError);
		expect(error.name).toBe("VoicevoxError");
		expect(error.code).toBe(VoicevoxResultCode.GpuSupportError);
		expect(error.message).toBe("GPU is not supported");
	});

	it("should have correct toString", () => {
		const error = new VoicevoxError(
			VoicevoxResultCode.ModelNotFoundError,
			"Model not found",
		);

		expect(error.toString()).toBe("VoicevoxError [7]: Model not found");
	});
});
