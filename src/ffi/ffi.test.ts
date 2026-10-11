/**
 * FFI層の統合テスト
 *
 * voicevox_coreと同じC APIシグネチャを持つモック共有ライブラリ
 * （fixtures/mock-voicevox-core.c）をコンパイルし、node:ffiによる宣言・
 * マーシャリング・構造体のABI lowering・Worker経由の非同期呼び出しを検証する。
 *
 * Cコンパイラが見つからない環境ではスキップされる。
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createOpenJtalk,
  deleteOpenJtalk,
  analyze,
  createUserDict,
  createUserDictWord,
  addUserDictWord,
  deleteUserDict,
} from "../api/open-jtalk.js";
import { loadOnnxruntime, getOnnxruntime } from "../api/onnxruntime.js";
import { createAudioQuery, tts } from "../api/talk.js";
import { validateScore } from "../api/validation.js";
import {
  openVoiceModelFile,
  getVoiceModelId,
  closeVoiceModelFile,
  isLoadedVoiceModel,
} from "../api/voice-model.js";
import { createSynthesizer, deleteSynthesizer, getVersion, isGpuMode } from "../api/voicevox.js";
import { createVoicevoxClient } from "../client/voicevox-client.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { VoicevoxAccelerationMode, VoicevoxUserDictWordType } from "../types/enums.js";
import type { OnnxruntimeHandle, OpenJtalkHandle, SynthesizerHandle } from "../types/handles.js";
import type { VoicevoxCoreFunctions } from "./functions.js";
import { loadLibrary } from "./library.js";
import { readCString, unpackInitializeOptions } from "./native.js";

const C_COMPILER = ["cc", "gcc", "clang"].find(
  (compiler) => spawnSync(compiler, ["--version"], { stdio: "ignore" }).status === 0,
);

describe.runIf(C_COMPILER !== undefined && process.platform !== "win32")(
  "FFI層統合テスト（モックライブラリ）",
  () => {
    let libDir: string;
    let libPath: string;
    let functions: VoicevoxCoreFunctions;
    let onnxruntime: OnnxruntimeHandle;
    let openJtalk: OpenJtalkHandle;
    let synthesizer: SynthesizerHandle;

    /** モックライブラリの検証用アクセサを取得する */
    function mockAccessor(name: string, returnType: string): () => unknown {
      return functions.lib.getFunction(name, { return: returnType, arguments: [] });
    }

    beforeAll(async () => {
      const fixtureSource = join(
        dirname(fileURLToPath(import.meta.url)),
        "fixtures",
        "mock-voicevox-core.c",
      );
      libDir = mkdtempSync(join(tmpdir(), "mock-voicevox-core-"));
      libPath = join(libDir, "libmock_voicevox_core.so");
      // C_COMPILERはdescribe.runIfで検証済み
      execFileSync(C_COMPILER ?? "cc", ["-shared", "-fPIC", "-O1", "-o", libPath, fixtureSource]);

      functions = loadLibrary(libPath);

      // 初期化フロー（非同期呼び出しはWorkerスレッド経由）
      onnxruntime = await loadOnnxruntime(functions, { filename: "custom_onnxruntime.so" });
      openJtalk = await createOpenJtalk(functions, "/mock/dict");
      synthesizer = await createSynthesizer(functions, onnxruntime, openJtalk, {
        accelerationMode: VoicevoxAccelerationMode.Gpu,
        cpuNumThreads: 4,
      });
    });

    afterAll(() => {
      if (synthesizer !== undefined) {
        deleteSynthesizer(functions, synthesizer);
      }
      if (openJtalk !== undefined) {
        deleteOpenJtalk(functions, openJtalk);
      }
      rmSync(libDir, { recursive: true, force: true });
    });

    test("cstring戻り値（静的文字列）を読み取れる", () => {
      expect(getVersion(functions)).toBe("0.0.0-mock");
      expect(functions.voicevox_error_result_to_message(0)).toBe("OK");
      expect(functions.voicevox_get_onnxruntime_lib_unversioned_filename()).toBe(
        "libmock_onnxruntime.so",
      );
    });

    test("構造体の値返しをloweringして読み取れる", () => {
      // VoicevoxLoadOnnxruntimeOptions { const char* } → cstring
      expect(functions.voicevox_make_default_load_onnxruntime_options()).toBe(
        "libmock_onnxruntime.so",
      );
      // VoicevoxInitializeOptions { int32_t; uint16_t } → u64
      expect(unpackInitializeOptions(functions.voicevox_make_default_initialize_options())).toEqual(
        { accelerationMode: 0, cpuNumThreads: 0 },
      );
      // VoicevoxSynthesisOptions / VoicevoxTtsOptions { bool } → bool_u8
      expect(functions.voicevox_make_default_synthesis_options()).toBe(true);
      expect(functions.voicevox_make_default_tts_options()).toBe(true);
    });

    test("構造体の値渡しをloweringして渡せる", () => {
      // loadOnnxruntimeに渡したVoicevoxLoadOnnxruntimeOptions.filename
      const lastFilename = mockAccessor("mock_last_onnxruntime_filename", "pointer");
      expect(readCString(lastFilename() as bigint)).toBe("custom_onnxruntime.so");

      // createSynthesizerに渡したVoicevoxInitializeOptions（u64パッキング）
      const lastAccelerationMode = mockAccessor("mock_last_acceleration_mode", "i32");
      const lastCpuNumThreads = mockAccessor("mock_last_cpu_num_threads", "u32");
      expect(lastAccelerationMode()).toBe(VoicevoxAccelerationMode.Gpu);
      expect(lastCpuNumThreads()).toBe(4);
    });

    test("ロード済みONNX Runtimeのハンドルを取得できる", () => {
      expect(getOnnxruntime(functions)).toBe(onnxruntime);
      expect(isGpuMode(functions, synthesizer)).toBe(false);
    });

    test("UTF-8文字列とJSON出力が往復できる（Worker経由の非同期呼び出し）", async () => {
      const audioQuery = await createAudioQuery(functions, synthesizer, "こんにちは、世界", 42);
      // モックは入力をエコーバックする
      expect(audioQuery).toEqual({ text: "こんにちは、世界", style_id: 42 });

      const analyzed = await analyze(functions, openJtalk, "テスト");
      expect(JSON.parse(analyzed)).toEqual({ text: "テスト", style_id: 0 });
    });

    test("tts: bool_u8オプションとWAVデータ出力", async () => {
      // モックは [upspeakフラグ, style_id, 入力文字列...] を返す
      const withDefault = await tts(functions, synthesizer, "abc", 7);
      expect([...withDefault]).toEqual([1, 7, 0x61, 0x62, 0x63]);

      const withoutUpspeak = await tts(functions, synthesizer, "abc", 7, {
        enableInterrogativeUpspeak: false,
      });
      expect(withoutUpspeak[0]).toBe(0);
    });

    test("エラーコードからVoicevoxErrorが生成される", async () => {
      // モックは空のdict_dirに対してエラーコード1を返す
      const promise = createOpenJtalk(functions, "");
      await expect(promise).rejects.toBeInstanceOf(VoicevoxError);
      await expect(promise).rejects.toThrow("mock error");
    });

    test("音声モデルID（Uint8Array出力引数）を読み取れる", async () => {
      const model = await openVoiceModelFile(functions, "/mock/model.vvm");
      expect(getVoiceModelId(functions, model)).toBe("00010203-0405-0607-0809-0a0b0c0d0e0f");
      closeVoiceModelFile(functions, model);
    });

    test("bool戻り値とUUIDバイト列引数", () => {
      // モックは先頭バイトが0のUUIDのみtrueを返す
      expect(
        isLoadedVoiceModel(functions, synthesizer, "00010203-0405-0607-0809-0a0b0c0d0e0f"),
      ).toBe(true);
      expect(
        isLoadedVoiceModel(functions, synthesizer, "ff010203-0405-0607-0809-0a0b0c0d0e0f"),
      ).toBe(false);
    });

    test("ユーザー辞書: VoicevoxUserDictWord構造体のパックと出力UUID", () => {
      const word = createUserDictWord(functions, "表記", "ヒョウキ", 3);
      expect(word).toEqual({
        surface: "表記",
        pronunciation: "ヒョウキ",
        accentType: 3,
        wordType: VoicevoxUserDictWordType.CommonNoun,
        priority: 5,
      });

      const userDict = createUserDict(functions);
      const uuid = addUserDictWord(functions, userDict, word);
      expect(uuid).toBe("a0a1a2a3-a4a5-a6a7-a8a9-aaabacadaeaf");

      // モックが受け取った構造体のフィールドを検証
      const lastSurface = mockAccessor("mock_last_word_surface", "pointer");
      const lastPronunciation = mockAccessor("mock_last_word_pronunciation", "pointer");
      const lastAccentType = mockAccessor("mock_last_word_accent_type", "u64");
      const lastWordType = mockAccessor("mock_last_word_type", "i32");
      const lastPriority = mockAccessor("mock_last_word_priority", "u32");
      expect(readCString(lastSurface() as bigint)).toBe("表記");
      expect(readCString(lastPronunciation() as bigint)).toBe("ヒョウキ");
      expect(lastAccentType()).toBe(3n);
      expect(lastWordType()).toBe(VoicevoxUserDictWordType.CommonNoun);
      expect(lastPriority()).toBe(5);

      deleteUserDict(functions, userDict);
    });

    test("存在しないオプショナル関数はundefinedになる", () => {
      // モックはバリデーション・歌唱系の関数を実装していない
      expect(functions.voicevox_score_validate).toBeUndefined();
      expect(functions.voicevox_synthesizer_frame_synthesis).toBeUndefined();
      expect(() => validateScore(functions, "{}")).toThrow("not available");
    });

    test("高レベルAPI（createVoicevoxClient）で一連のフローが動作する", async () => {
      const client = await createVoicevoxClient({
        corePath: libPath,
        openJtalkDictDir: "/mock/dict",
      });
      try {
        expect(client.getVersion()).toBe("0.0.0-mock");
        expect(client.getLoadedSpeakers()).toEqual([]);
        const wav = await client.tts("やあ", 5);
        expect([...wav]).toEqual([1, 5, 0xe3, 0x82, 0x84, 0xe3, 0x81, 0x82]);
      } finally {
        client.close();
      }
    });
  },
);
