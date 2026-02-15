import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

describe("Basic E2E Tests", () => {
  let client: VoicevoxClient;
  const paths = getEnvPaths();

  beforeAll(async () => {
    client = await createVoicevoxClient({
      corePath: paths.corePath,
      onnxruntimePath: paths.onnxruntimePath,
      openJtalkDictDir: paths.openJtalkDictDir,
    });
  });

  afterAll(() => {
    client?.close();
  });

  describe("クライアント初期化", () => {
    it("クライアントが正常に初期化されること", () => {
      expect(client).toBeDefined();
    });

    it("CPUモードで動作すること", () => {
      expect(client.isGpuMode).toBe(false);
    });
  });

  describe("バージョン情報", () => {
    it("バージョン文字列を取得できること", () => {
      const version = client.getVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe("モデル操作", () => {
    it("モデルファイルのメタ情報を取得できること", async () => {
      const metas = await client.peekModelFilesMeta(paths.modelsPath);

      expect(metas).toBeDefined();
      expect(Array.isArray(metas)).toBe(true);
      expect(metas.length).toBeGreaterThan(0);

      const meta = metas[0];
      expect(meta.name).toBeDefined();
      expect(meta.speaker_uuid).toBeDefined();
      expect(meta.styles).toBeDefined();
      expect(Array.isArray(meta.styles)).toBe(true);
      expect(meta.modelFilePath).toBeDefined();
      expect(meta.modelId).toBeInstanceOf(Uint8Array);
    });

    it("存在しないディレクトリのメタ情報を取得しようとするとエラーが発生すること", async () => {
      await expect(client.peekModelFilesMeta("/non/existent/directory")).rejects.toThrow();
    });

    it("モデルをロードできること", async () => {
      await client.loadVoiceModelFromPath(`${paths.modelsPath}/0.vvm`);

      const speakers = client.getLoadedSpeakers();
      expect(speakers.length).toBeGreaterThan(0);
    });

    it("複数のモデルをロードできること", async () => {
      await client.loadVoiceModelFromPath(`${paths.modelsPath}/1.vvm`, `${paths.modelsPath}/2.vvm`);

      const speakers = client.getLoadedSpeakers();
      expect(speakers.length).toBeGreaterThanOrEqual(3);
    });

    it("存在しないモデルファイルをロードしようとするとエラーが発生すること", async () => {
      await expect(client.loadVoiceModelFromPath("/non/existent/model.vvm")).rejects.toThrow();
    });

    it("無効なパスのモデルファイルをロードしようとするとエラーが発生すること", async () => {
      await expect(client.loadVoiceModelFromPath("")).rejects.toThrow();
    });
  });

  describe("スピーカー情報", () => {
    it("ロード済みスピーカー情報を取得できること", () => {
      const speakers = client.getLoadedSpeakers();

      expect(speakers).toBeDefined();
      expect(Array.isArray(speakers)).toBe(true);
      expect(speakers.length).toBeGreaterThan(0);

      const speaker = speakers[0];
      expect(speaker.name).toBeDefined();
      expect(speaker.speaker_uuid).toBeDefined();
      expect(speaker.styles).toBeDefined();
      expect(Array.isArray(speaker.styles)).toBe(true);
      expect(speaker.styles.length).toBeGreaterThan(0);
      expect(speaker.styles[0].id).toBeDefined();
    });
  });

  describe("音声合成（TTS）", () => {
    it("テキストから音声を合成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const styleId = speakers[0].styles[0].id;

      const wav = await client.tts("こんにちは、VOICEVOXです。", styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認 (RIFF)
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'
    });

    it("短いテキストから音声を合成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const styleId = speakers[0].styles[0].id;

      const wav = await client.tts("テスト", styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("TTSオプションを指定して音声を合成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const styleId = speakers[0].styles[0].id;

      const wav = await client.tts("疑問文ですか？", styleId, {
        enableInterrogativeUpspeak: true,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("WAVファイルを出力できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const styleId = speakers[0].styles[0].id;

      const wav = await client.tts("ファイル出力テスト", styleId);

      // outputディレクトリを作成
      await mkdir(paths.outputDir, { recursive: true });

      // WAVファイルを保存
      const outputPath = join(paths.outputDir, "basic-tts-test.wav");
      await writeFile(outputPath, wav);

      // ファイルが作成されたことを確認
      const { stat } = await import("node:fs/promises");
      const stats = await stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("無効なスタイルIDで音声合成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.tts("テスト", invalidStyleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("負のスタイルIDで音声合成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = -1;
      await expect(client.tts("テスト", invalidStyleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空文字列で音声合成しようとするとエラーが発生すること", async () => {
      const speakers = client.getLoadedSpeakers();
      const styleId = speakers[0].styles[0].id;
      await expect(client.tts("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("リソース管理", () => {
    it("close()でリソースを解放できること", async () => {
      const tempClient = await createVoicevoxClient({
        corePath: paths.corePath,
        onnxruntimePath: paths.onnxruntimePath,
        openJtalkDictDir: paths.openJtalkDictDir,
      });

      tempClient.close();

      // 破棄後の操作でエラーが発生すること
      expect(() => tempClient.getVersion()).toThrow("VoicevoxClient has been disposed");
    });

    it("close()後に各メソッドでエラーが発生すること", async () => {
      const tempClient = await createVoicevoxClient({
        corePath: paths.corePath,
        onnxruntimePath: paths.onnxruntimePath,
        openJtalkDictDir: paths.openJtalkDictDir,
      });

      tempClient.close();

      // 各メソッドでエラーが発生することを確認
      expect(() => tempClient.getVersion()).toThrow("VoicevoxClient has been disposed");
      expect(() => tempClient.isGpuMode).toThrow("VoicevoxClient has been disposed");
      expect(() => tempClient.getLoadedSpeakers()).toThrow("VoicevoxClient has been disposed");
    });

    it("複数回close()を呼び出してもエラーにならないこと", async () => {
      const tempClient = await createVoicevoxClient({
        corePath: paths.corePath,
        onnxruntimePath: paths.onnxruntimePath,
        openJtalkDictDir: paths.openJtalkDictDir,
      });

      tempClient.close();
      expect(() => tempClient.close()).not.toThrow();
      tempClient.close(); // 3回目も問題ない
    });

    it("using宣言でDisposableとして使用できること", async () => {
      {
         using tempClient = await createVoicevoxClient({
          corePath: paths.corePath,
          onnxruntimePath: paths.onnxruntimePath,
          openJtalkDictDir: paths.openJtalkDictDir,
        });

        expect(tempClient).toBeDefined();
      }

      // スコープを抜けたら自動的に解放されるため、特に検証は不要
      // （コンパイルエラーにならないことが重要）
    });
  });

  describe("エラー情報", () => {
    it("VoicevoxErrorが適切な情報を持つこと", async () => {
      try {
        await client.tts("テスト", 999999);
        expect.fail("エラーが発生しませんでした");
      } catch (error) {
        expect(error).toBeInstanceOf(VoicevoxError);

        if (error instanceof VoicevoxError) {
          // エラーコードとメッセージが存在すること
          expect(error.code).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
          expect(error.message.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
