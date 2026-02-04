/**
 * 列挙型のテスト
 */

import { describe, it, expect } from "vitest";
import {
	VoicevoxAccelerationMode,
	VoicevoxResultCode,
	VoicevoxUserDictWordType,
} from "./enums.js";

describe("VoicevoxAccelerationMode", () => {
	it("should have correct values", () => {
		expect(VoicevoxAccelerationMode.Auto).toBe(0);
		expect(VoicevoxAccelerationMode.Cpu).toBe(1);
		expect(VoicevoxAccelerationMode.Gpu).toBe(2);
	});
});

describe("VoicevoxResultCode", () => {
	it("should have Ok as 0", () => {
		expect(VoicevoxResultCode.Ok).toBe(0);
	});

	it("should have error codes", () => {
		expect(VoicevoxResultCode.NotLoadedOpenjtalkDictError).toBe(1);
		expect(VoicevoxResultCode.GetSupportedDevicesError).toBe(3);
		expect(VoicevoxResultCode.GpuSupportError).toBe(4);
	});
});

describe("VoicevoxUserDictWordType", () => {
	it("should have correct values", () => {
		expect(VoicevoxUserDictWordType.ProperNoun).toBe(0);
		expect(VoicevoxUserDictWordType.CommonNoun).toBe(1);
		expect(VoicevoxUserDictWordType.Verb).toBe(2);
		expect(VoicevoxUserDictWordType.Adjective).toBe(3);
		expect(VoicevoxUserDictWordType.Suffix).toBe(4);
	});
});
