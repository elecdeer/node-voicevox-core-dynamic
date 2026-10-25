/**
 * ストリーミング音声合成のJS側ロジックのテスト
 */

import { describe, expect, test } from "vite-plus/test";
import { createWavHeader, toSegmentFrames, VOICEVOX_FRAME_RATE } from "./streaming.js";

describe("toSegmentFrames", () => {
  test("デフォルトは先頭から0.3秒（28フレーム）ずつ", () => {
    expect(toSegmentFrames(100)).toEqual({ startOffsetFrames: 0, segmentFrames: 28 });
  });

  test("秒をフレーム数に換算し、0.5はtiesToEvenで丸める", () => {
    expect(
      toSegmentFrames(100, {
        startOffsetInSecs: 2.5 / VOICEVOX_FRAME_RATE,
        segmentLengthInSecs: 3.5 / VOICEVOX_FRAME_RATE,
      }),
    ).toEqual({ startOffsetFrames: 2, segmentFrames: 4 });
  });

  test("開始位置は総フレーム数ちょうどまで許容する", () => {
    expect(toSegmentFrames(10, { startOffsetInSecs: 10 / VOICEVOX_FRAME_RATE })).toMatchObject({
      startOffsetFrames: 10,
    });
  });

  test.each([-0.01, 11 / VOICEVOX_FRAME_RATE, Number.NaN])(
    "開始位置%sは範囲外",
    (startOffsetInSecs) => {
      expect(() => toSegmentFrames(10, { startOffsetInSecs })).toThrow(RangeError);
    },
  );

  test.each([0, 0.5 / VOICEVOX_FRAME_RATE, -1, Number.NaN])(
    "区間の長さ%sは1フレーム未満",
    (segmentLengthInSecs) => {
      expect(() => toSegmentFrames(10, { segmentLengthInSecs })).toThrow(RangeError);
    },
  );
});

describe("createWavHeader", () => {
  test("16bit PCMのRIFF/WAVEヘッダを作成する", () => {
    const header = Buffer.from(createWavHeader(1000, 48000, true));

    expect(header.byteLength).toBe(44);
    expect(header.toString("ascii", 0, 4)).toBe("RIFF");
    expect(header.readUInt32LE(4)).toBe(44 + 1000 - 8);
    expect(header.toString("ascii", 8, 16)).toBe("WAVEfmt ");
    expect(header.readUInt32LE(16)).toBe(16);
    expect(header.readUInt16LE(20)).toBe(1);
    expect(header.readUInt16LE(22)).toBe(2);
    expect(header.readUInt32LE(24)).toBe(48000);
    expect(header.readUInt32LE(28)).toBe(48000 * 4);
    expect(header.readUInt16LE(32)).toBe(4);
    expect(header.readUInt16LE(34)).toBe(16);
    expect(header.toString("ascii", 36, 40)).toBe("data");
    expect(header.readUInt32LE(40)).toBe(1000);
  });
});
