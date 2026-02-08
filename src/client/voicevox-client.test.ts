/**
 * VoicevoxClient型テスト
 */

import { describe, test } from "vitest";
import type { VoicevoxClient, VoicevoxModelFile } from "./types.js";

describe("VoicevoxClient型テスト", () => {
  test("VoicevoxClientはDisposableを実装している", () => {
    // 型レベルのテスト: コンパイルが通ればOK
    const _typeCheck = (_client: VoicevoxClient): Disposable => {
      return _client;
    };
    // 使用していない関数の警告を抑制
    void _typeCheck;
  });
});

describe("VoicevoxModelFile型テスト", () => {
  test("VoicevoxModelFileはDisposableを実装している", () => {
    // 型レベルのテスト: コンパイルが通ればOK
    const _typeCheck = (_modelFile: VoicevoxModelFile): Disposable => {
      return _modelFile;
    };
    // 使用していない関数の警告を抑制
    void _typeCheck;
  });
});
