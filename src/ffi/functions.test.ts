/**
 * 構造体の値渡しのABI loweringのテスト
 *
 * x86-64 SysVのloweringは実行環境のアーキテクチャによらず、展開後の
 * シグネチャと引数の並びを検証する（実際の呼び出しはffi.test.tsがx64環境で検証する）。
 */

import { describe, expect, test } from "vite-plus/test";
import { marshalArguments, toNativeSignature } from "./functions.js";
import { AUDIO_FEATURE_SLICE_SIZE, getNodeFfi, getStructPassingAbi } from "./native.js";

/** 8バイトごとに1, 2, 3, 4が入ったスライス構造体 */
function createSlice(): Buffer {
  const slice = Buffer.alloc(AUDIO_FEATURE_SLICE_SIZE);
  for (let i = 0; i < 4; i++) {
    slice.writeBigUInt64LE(BigInt(i + 1), i * 8);
  }
  return slice;
}

describe("getStructPassingAbi", () => {
  test.each([
    ["arm64", "darwin", "indirect"],
    ["arm64", "linux", "indirect"],
    ["x64", "win32", "indirect"],
    ["x64", "linux", "sysv-x64"],
    ["x64", "darwin", "sysv-x64"],
    ["ia32", "win32", undefined],
  ] as const)("%s-%s → %s", (arch, platform, expected) => {
    expect(getStructPassingAbi(arch, platform)).toBe(expected);
  });
});

describe("toNativeSignature", () => {
  test("構造体を含まないシグネチャは擬似型だけを変換する", () => {
    const signature = { return: "cstring", arguments: ["bool_u8", "pointer"] } as const;
    expect(toNativeSignature(signature, "sysv-x64")).toEqual({
      return: "pointer",
      arguments: ["u8", "pointer"],
    });
  });

  test("indirect: 構造体をその位置のpointerにする", () => {
    const signature = {
      return: "i32",
      arguments: ["pointer", "audio_feature_slice", "pointer", "pointer"],
    } as const;
    expect(toNativeSignature(signature, "indirect")).toEqual({
      return: "i32",
      arguments: ["pointer", "pointer", "pointer", "pointer"],
    });
  });

  test("sysv-x64: 整数レジスタを埋めた後に構造体をu64×4として並べる", () => {
    const signature = {
      return: "i32",
      arguments: ["pointer", "audio_feature_slice", "pointer", "pointer"],
    } as const;
    expect(toNativeSignature(signature, "sysv-x64")).toEqual({
      return: "i32",
      arguments: ["pointer", "pointer", "pointer", "u64", "u64", "u64", "u64", "u64", "u64", "u64"],
    });
  });

  test("sysv-x64: 整数引数が6個ならダミーを入れない", () => {
    const signature = {
      return: "i32",
      arguments: ["audio_feature_slice", "u64", "u64", "bool", "bool", "bool", "pointer"],
    } as const;
    expect(toNativeSignature(signature, "sysv-x64").arguments).toEqual([
      "u64",
      "u64",
      "bool",
      "bool",
      "bool",
      "pointer",
      "u64",
      "u64",
      "u64",
      "u64",
    ]);
  });

  test("sysv-x64: loweringできないシグネチャはエラーにする", () => {
    const tooManyRegisters = {
      return: "void",
      arguments: ["audio_feature_slice", "u64", "u64", "u64", "u64", "u64", "u64", "u64"],
    } as const;
    expect(() => toNativeSignature(tooManyRegisters, "sysv-x64")).toThrow("Unsupported");

    const twoStructs = {
      return: "void",
      arguments: ["audio_feature_slice", "audio_feature_slice"],
    } as const;
    expect(() => toNativeSignature(twoStructs, "sysv-x64")).toThrow("Unsupported");
  });

  test("未対応のプラットフォームではエラーにする", () => {
    const signature = { return: "void", arguments: ["audio_feature_slice"] } as const;
    expect(() => toNativeSignature(signature, undefined)).toThrow("not supported");
  });
});

describe("marshalArguments", () => {
  const ffi = getNodeFfi();
  const types = ["pointer", "audio_feature_slice", "pointer", "pointer"] as const;

  test("sysv-x64: 構造体の8バイトずつをダミーの後ろに並べる", () => {
    const { values } = marshalArguments("f", types, [1n, createSlice(), 2n, 3n], ffi, "sysv-x64");
    expect(values).toEqual([1n, 2n, 3n, 0n, 0n, 0n, 1n, 2n, 3n, 4n]);
  });

  test("indirect: 構造体のコピーへのポインタを渡し、コピーを保持する", () => {
    const slice = createSlice();
    const { values, keepAlive } = marshalArguments(
      "f",
      types,
      [1n, slice, 2n, 3n],
      ffi,
      "indirect",
    );
    expect(values).toHaveLength(4);
    expect(values[1]).not.toBe(ffi.getRawPointer(slice));
    // 内容は同じだが別のBuffer
    expect(keepAlive).toEqual([slice]);
    expect(keepAlive[0]).not.toBe(slice);
  });

  test("bool引数は0/1の数値に変換する", () => {
    const { values } = marshalArguments("f", ["bool", "bool"], [true, false], ffi, "indirect");
    expect(values).toEqual([1, 0]);
  });

  test("サイズの異なる構造体はTypeErrorにする", () => {
    expect(() =>
      marshalArguments("f", types, [1n, new Uint8Array(16), 2n, 3n], ffi, "indirect"),
    ).toThrow(TypeError);
  });
});
