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
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
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
import {
  createAudioFeature,
  deleteAudioFeature,
  getAudioFeatureLength,
  getAudioQueryFrameLength,
  getFrameRate,
  renderAudioFeature,
  streamingSynthesis,
  wavFromS16le,
  WAV_HEADER_LENGTH,
} from "../api/streaming.js";
import { createAudioQuery, tts } from "../api/talk.js";
import { validateScore } from "../api/validation.js";
import {
  openVoiceModelFile,
  getVoiceModelId,
  closeVoiceModelFile,
  isLoadedVoiceModel,
  loadVoiceModel,
} from "../api/voice-model.js";
import { createSynthesizer, deleteSynthesizer, getVersion, isGpuMode } from "../api/voicevox.js";
import { createVoicevoxClient } from "../client/voicevox-client.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import {
  VoicevoxAccelerationMode,
  VoicevoxOnExistingVoiceModelId,
  VoicevoxResultCode,
  VoicevoxUserDictWordType,
} from "../types/enums.js";
import type { OnnxruntimeHandle, OpenJtalkHandle, SynthesizerHandle } from "../types/handles.js";
import type { AudioQuery } from "../types/models.js";
import type { VoicevoxCoreFunctions } from "./functions.js";
import { loadLibrary } from "./library.js";
import {
  allocOutPointer,
  AUDIO_FEATURE_SLICE_SIZE,
  readCString,
  readOutSize,
  unpackInitializeOptions,
} from "./native.js";

/** モックの総フレーム数はJSONの長さ（+upspeak時1）なので、短いAudioQueryを使う */
const AUDIO_QUERY: AudioQuery = {
  accent_phrases: [],
  speedScale: 1,
  pitchScale: 0,
  intonationScale: 1,
  volumeScale: 1,
  prePhonemeLength: 0.1,
  postPhonemeLength: 0.1,
  outputSamplingRate: 24000,
  outputStereo: false,
};

/** モックが返すAUDIO_QUERYの総フレーム数（upspeak有効時） */
const AUDIO_QUERY_FRAMES = JSON.stringify(AUDIO_QUERY).length + 1;

/** モックのrenderの出力（フレームごとに [フレーム番号下位バイト, style_id下位バイト]）を作る */
function mockPcm(start: number, end: number, styleId: number): number[] {
  return Array.from({ length: end - start }, (_, i) => [(start + i) & 0xff, styleId]).flat();
}

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
      expect(functions.voicevox_get_onnxruntime_lib_recommended_unversioned_filename()).toBe(
        "libmock_onnxruntime.so",
      );
      expect(functions.voicevox_get_onnxruntime_lib_recommended_versioned_filename()).toBe(
        "libmock_onnxruntime.so.1.0.0",
      );
    });

    test("u32/f64戻り値を読み取れる", () => {
      expect(functions.voicevox_get_onnxruntime_lib_min_required_minor_version()).toBe(17);
      expect(functions.voicevox_get_onnxruntime_lib_max_supported_minor_version()).toBe(23);
      expect(getFrameRate(functions)).toBe(93.75);
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
      // VoicevoxAudioQueryFrameLengthOptions { bool } → bool_u8
      expect(functions.voicevox_make_default_audio_query_frame_length_options()).toBe(true);
      // VoicevoxLoadVoiceModelOptions { int32_t } → i32
      expect(functions.voicevox_make_default_load_voice_model_options()).toBe(
        VoicevoxOnExistingVoiceModelId.Error,
      );
    });

    test("loadVoiceModel: VoicevoxLoadVoiceModelOptionsをi32として渡せる", async () => {
      const lastOnExisting = mockAccessor("mock_last_on_existing", "i32");
      const model = await openVoiceModelFile(functions, "/mock/model.vvm");
      try {
        await loadVoiceModel(functions, synthesizer, model);
        expect(lastOnExisting()).toBe(VoicevoxOnExistingVoiceModelId.Error);

        await loadVoiceModel(functions, synthesizer, model, {
          onExisting: VoicevoxOnExistingVoiceModelId.Reload,
        });
        expect(lastOnExisting()).toBe(VoicevoxOnExistingVoiceModelId.Reload);
      } finally {
        closeVoiceModelFile(functions, model);
      }
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

    test("バリデーション関数の結果コードを扱える", () => {
      // モックは"{}"以外に対してエラーを返す
      expect(() => validateScore(functions, "{}")).not.toThrow();
      expect(() => validateScore(functions, "[]")).toThrow(VoicevoxError);
    });

    test("getAudioQueryFrameLength: bool_u8オプションと出力サイズ", () => {
      // モックはJSONの長さ（+upspeak時1）を返す
      expect(getAudioQueryFrameLength(functions, AUDIO_QUERY)).toBe(AUDIO_QUERY_FRAMES);
      expect(
        getAudioQueryFrameLength(functions, AUDIO_QUERY, { enableInterrogativeUpspeak: false }),
      ).toBe(AUDIO_QUERY_FRAMES - 1);
    });

    test("wavFromS16le: bool・u64引数とバイト列出力", () => {
      // モックは [is_stereo, sampling_rate下位バイト, pcm...] を返す
      const wav = wavFromS16le(functions, new Uint8Array([1, 2, 3]), 48000, true);
      expect([...wav]).toEqual([1, 48000 & 0xff, 1, 2, 3]);
      // 空のPCMでも非ヌルポインタを渡せる
      expect([...wavFromS16le(functions, new Uint8Array(0), 24000, false)]).toEqual([
        0,
        24000 & 0xff,
      ]);
    });

    test("VoicevoxAudioFeatureSliceを値渡しできる（引数位置・レジスタ数の異なる関数）", async () => {
      const audioFeature = await createAudioFeature(functions, synthesizer, AUDIO_QUERY, 9);
      try {
        expect(getAudioFeatureLength(functions, audioFeature)).toBe(AUDIO_QUERY_FRAMES);

        const slice = Buffer.alloc(AUDIO_FEATURE_SLICE_SIZE);
        expect(
          functions.voicevox_audio_feature_slice(audioFeature, 3n, 10n, false, false, false, slice),
        ).toBe(VoicevoxResultCode.Ok);

        // 構造体が第1引数（残りの整数引数は1個）
        const outLength = allocOutPointer();
        expect(functions.voicevox_audio_feature_slice_len(slice, outLength)).toBe(0);
        expect(readOutSize(outLength)).toBe(7);

        const outIsEmpty = Buffer.alloc(1);
        expect(functions.voicevox_audio_feature_slice_is_empty(slice, outIsEmpty)).toBe(0);
        expect(outIsEmpty[0]).toBe(0);

        // 構造体が第1引数（残りの整数引数が6個でレジスタを使い切る）
        const subSlice = Buffer.alloc(AUDIO_FEATURE_SLICE_SIZE);
        expect(
          functions.voicevox_audio_feature_slice_slice(slice, 2n, 4n, true, false, false, subSlice),
        ).toBe(0);
        expect(functions.voicevox_audio_feature_slice_len(subSlice, outLength)).toBe(0);
        expect(readOutSize(outLength)).toBe(3);

        // 構造体が第2引数（Worker経由の非同期呼び出し）
        const outPcmLength = allocOutPointer();
        const outPcm = allocOutPointer();
        expect(
          await functions.voicevox_synthesizer_render.async(
            synthesizer,
            subSlice,
            outPcmLength,
            outPcm,
          ),
        ).toBe(0);
        expect(readOutSize(outPcmLength)).toBe(6);
      } finally {
        deleteAudioFeature(functions, audioFeature);
      }
    });

    test("renderAudioFeature: 区間のPCMを生成し、範囲外はVoicevoxErrorになる", async () => {
      const emptyBytesFreeCount = mockAccessor("mock_empty_bytes_free_count", "i32");
      const audioFeature = await createAudioFeature(functions, synthesizer, AUDIO_QUERY, 4);
      try {
        expect([...(await renderAudioFeature(functions, synthesizer, audioFeature, 5, 8))]).toEqual(
          mockPcm(5, 8, 4),
        );
        // 省略時は全体
        const whole = await renderAudioFeature(functions, synthesizer, audioFeature);
        expect(whole.byteLength).toBe(AUDIO_QUERY_FRAMES * 2);

        // 空区間はvoicevox_empty_bytesが返り、解放されない
        const empty = await renderAudioFeature(functions, synthesizer, audioFeature, 2, 2);
        expect(empty.byteLength).toBe(0);
        expect(emptyBytesFreeCount()).toBe(0);

        const outOfBounds = renderAudioFeature(
          functions,
          synthesizer,
          audioFeature,
          0,
          AUDIO_QUERY_FRAMES + 1,
        );
        await expect(outOfBounds).rejects.toMatchObject({
          code: VoicevoxResultCode.EndOutOfBoundsError,
        });
        await expect(
          renderAudioFeature(functions, synthesizer, audioFeature, -1, 2),
        ).rejects.toBeInstanceOf(RangeError);
      } finally {
        deleteAudioFeature(functions, audioFeature);
      }
    });

    test("streamingSynthesis: WAVヘッダの後に区間ごとのPCMを返し、中間表現を破棄する", async () => {
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const deletedBefore = deleteCount() as number;

      const chunks: Uint8Array[] = [];
      for await (const chunk of streamingSynthesis(functions, synthesizer, AUDIO_QUERY, 3, {
        segmentLengthInSecs: 10 / 93.75,
      })) {
        chunks.push(chunk);
      }

      const [header, ...pcms] = chunks;
      expect(header?.byteLength).toBe(WAV_HEADER_LENGTH);
      const headerView = Buffer.from(header ?? new Uint8Array());
      // data チャンクの長さは「総フレーム数 × 256サンプル × 2バイト」
      expect(headerView.toString("ascii", 36, 40)).toBe("data");
      expect(headerView.readUInt32LE(40)).toBe(AUDIO_QUERY_FRAMES * 256 * 2);

      const expectedSegments = Math.ceil(AUDIO_QUERY_FRAMES / 10);
      expect(pcms).toHaveLength(expectedSegments);
      expect([...(pcms[0] ?? [])]).toEqual(mockPcm(0, 10, 3));
      expect([...(pcms.at(-1) ?? [])]).toEqual(
        mockPcm((expectedSegments - 1) * 10, AUDIO_QUERY_FRAMES, 3),
      );
      expect(deleteCount()).toBe(deletedBefore + 1);
    });

    test("streamingSynthesis: startOffsetInSecsから開始し、breakしても中間表現を破棄する", async () => {
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const deletedBefore = deleteCount() as number;

      const stream = streamingSynthesis(functions, synthesizer, AUDIO_QUERY, 3, {
        startOffsetInSecs: 4 / 93.75,
        segmentLengthInSecs: 2 / 93.75,
      });
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
        if (chunks.length === 2) {
          break;
        }
      }

      expect(Buffer.from(chunks[0] ?? new Uint8Array()).readUInt32LE(40)).toBe(
        (AUDIO_QUERY_FRAMES - 4) * 256 * 2,
      );
      expect([...(chunks[1] ?? [])]).toEqual(mockPcm(4, 6, 3));
      expect(deleteCount()).toBe(deletedBefore + 1);
    });

    test("streamingSynthesis: 1区間先を先読みし、途中でやめても先読みの完了後に破棄する", async () => {
      const renderCount = mockAccessor("mock_render_count", "i32");
      const renderAfterDeleteCount = mockAccessor("mock_render_after_delete_count", "i32");
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const renderedBefore = renderCount() as number;
      const deletedBefore = deleteCount() as number;

      const stream = streamingSynthesis(functions, synthesizer, AUDIO_QUERY, 3, {
        segmentLengthInSecs: 2 / 93.75,
      });
      const header = await stream.next();
      expect(header.value?.byteLength).toBe(WAV_HEADER_LENGTH);
      const first = await stream.next();
      expect([...(first.value ?? [])]).toEqual(mockPcm(0, 2, 3));

      // 2つ目の区間を受け取る前にやめる
      await stream.return();

      // 消費したのは1区間だが、先読みした2区間目も生成済み
      expect(renderCount()).toBe(renderedBefore + 2);
      expect(renderAfterDeleteCount()).toBe(0);
      expect(deleteCount()).toBe(deletedBefore + 1);
    });

    test("streamingSynthesis: 先読み中の生成の失敗は該当区間でVoicevoxErrorになる", async () => {
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const deletedBefore = deleteCount() as number;

      // モックはスタイルID 254で先頭以外の区間のrenderを失敗させる
      const stream = streamingSynthesis(functions, synthesizer, AUDIO_QUERY, 254, {
        segmentLengthInSecs: 2 / 93.75,
      });
      await stream.next();
      expect([...((await stream.next()).value ?? [])]).toEqual(mockPcm(0, 2, 254));
      await expect(stream.next()).rejects.toMatchObject({
        code: VoicevoxResultCode.RunModelError,
      });
      expect(deleteCount()).toBe(deletedBefore + 1);
    });

    test("streamingSynthesis: 区切り方が不正な場合は中間表現を作らずRangeErrorになる", async () => {
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const deletedBefore = deleteCount() as number;

      const stream = streamingSynthesis(functions, synthesizer, AUDIO_QUERY, 3, {
        segmentLengthInSecs: 0,
      });
      await expect(stream.next()).rejects.toBeInstanceOf(RangeError);
      expect(deleteCount()).toBe(deletedBefore);
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

        expect(client.getAudioQueryFrameLength(AUDIO_QUERY)).toBe(AUDIO_QUERY_FRAMES);

        const chunks: Uint8Array[] = [];
        for await (const chunk of client.streamingSynthesis(AUDIO_QUERY, 6)) {
          chunks.push(chunk);
        }
        // デフォルトは0.3秒（28フレーム）ずつ
        expect(chunks).toHaveLength(1 + Math.ceil(AUDIO_QUERY_FRAMES / 28));
      } finally {
        client.close();
      }
    });

    test("高レベルAPI: AudioFeatureは生成中のrenderが終わってから破棄される", async () => {
      const deleteCount = mockAccessor("mock_audio_feature_delete_count", "i32");
      const client = await createVoicevoxClient({
        corePath: libPath,
        openJtalkDictDir: "/mock/dict",
      });
      try {
        const deletedBefore = deleteCount() as number;
        const audioFeature = await client.createAudioFeature(AUDIO_QUERY, 2);
        expect(audioFeature.length).toBe(AUDIO_QUERY_FRAMES);

        const rendering = audioFeature.render(0, 3);
        audioFeature.close();
        expect(deleteCount()).toBe(deletedBefore);
        expect([...(await rendering)]).toEqual(mockPcm(0, 3, 2));
        expect(deleteCount()).toBe(deletedBefore + 1);

        audioFeature.close();
        expect(deleteCount()).toBe(deletedBefore + 1);
        await expect(audioFeature.render()).rejects.toThrow("closed");
      } finally {
        client.close();
      }
    });
  },
);
