import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";

describe("Error Handling E2E Tests", () => {
  let client: VoicevoxClient;
  let styleId: number;
  const paths = getEnvPaths();

  beforeAll(async () => {
    client = await createVoicevoxClient({
      corePath: paths.corePath,
      onnxruntimePath: paths.onnxruntimePath,
      openJtalkDictDir: paths.openJtalkDictDir,
    });

    // モデルをロード
    await client.loadVoiceModelFromPath(`${paths.modelsPath}/0.vvm`);
    const speakers = client.getLoadedSpeakers();
    styleId = speakers[0].styles[0].id;
  });

  afterAll(() => {
    client?.close();
  });

  describe("モデルファイル関連のエラー", () => {
    it("存在しないモデルファイルをロードしようとするとエラーが発生すること", async () => {
      await expect(client.loadVoiceModelFromPath("/non/existent/model.vvm")).rejects.toThrow();
    });

    it("存在しないディレクトリのメタ情報を取得しようとするとエラーが発生すること", async () => {
      await expect(client.peekModelFilesMeta("/non/existent/directory")).rejects.toThrow();
    });

    it("無効なパスのモデルファイルをロードしようとするとエラーが発生すること", async () => {
      await expect(client.loadVoiceModelFromPath("")).rejects.toThrow();
    });
  });

  describe("スタイルID関連のエラー", () => {
    it("無効なスタイルIDで音声合成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.tts("テスト", invalidStyleId)).rejects.toThrow(VoicevoxError);
    });

    it("無効なスタイルIDでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.createAudioQuery("テスト", invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it("無効なスタイルIDでアクセント句を生成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.createAccentPhrases("テスト", invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("負のスタイルIDで音声合成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = -1;
      await expect(client.tts("テスト", invalidStyleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("クライアント破棄後のエラー", () => {
    it("close()後に操作するとエラーが発生すること", async () => {
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
  });

  describe("入力テキスト関連のエラー", () => {
    it.skip("空文字列で音声合成しようとするとエラーが発生すること", async () => {
      await expect(client.tts("", styleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空文字列でAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQuery("", styleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空文字列でアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrases("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("カナ入力関連のエラー", () => {
    it("AquesTalk風記法でないカナで音声合成しようとするとエラーが発生すること", async () => {
      await expect(client.ttsFromKana("コンニチワ", styleId)).rejects.toThrow(VoicevoxError);
    });

    it("AquesTalk風記法でないカナでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromKana("コンニチワ", styleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it("AquesTalk風記法でないカナでアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrasesFromKana("コンニチワ", styleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("空のカナで音声合成しようとするとエラーが発生すること", async () => {
      await expect(client.ttsFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空のカナでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空のカナでアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrasesFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("VoicevoxErrorの構造", () => {
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

  describe("AudioQuery関連のエラー", () => {
    it.skip("空のアクセント句配列からAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromAccentPhrases([])).rejects.toThrow();
    });
  });
});
