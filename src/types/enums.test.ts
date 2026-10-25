/**
 * 列挙型のテスト
 */

import { describe, it, expect } from "vite-plus/test";
import {
  VoicevoxAccelerationMode,
  VoicevoxOnExistingVoiceModelId,
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

  it("should have error codes added in v0.17", () => {
    expect(VoicevoxResultCode.InvalidModelFormatError).toBe(28);
    expect(VoicevoxResultCode.StartOutOfBoundsError).toBe(36);
    expect(VoicevoxResultCode.EndOutOfBoundsError).toBe(37);
    expect(VoicevoxResultCode.StartExceedsEndError).toBe(38);
  });
});

describe("VoicevoxOnExistingVoiceModelId", () => {
  it("should have correct values", () => {
    expect(VoicevoxOnExistingVoiceModelId.Error).toBe(0);
    expect(VoicevoxOnExistingVoiceModelId.Reload).toBe(1);
    expect(VoicevoxOnExistingVoiceModelId.Skip).toBe(2);
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
