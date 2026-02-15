import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
describe("Kana Input E2E Tests", () => {
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

  describe("カナからTTS", () => {
    it("アクセント記号付きカナから音声を合成できること", async () => {
      // アクセント句の区切りとアクセント位置を指定
      // '/'でアクセント句の区切り、アクセント位置は数字で指定
      const wav = await client.ttsFromKana("コ'ンニチワ/ボ'イスボックスデ_ス", styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'
    });

    it("TTSオプションを指定してカナから音声を合成できること", async () => {
      const wav = await client.ttsFromKana("ギモ'ンブンデ_スカ", styleId, {
        enableInterrogativeUpspeak: true,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("AquesTalk風記法でないカナで音声合成しようとするとエラーが発生すること", async () => {
      await expect(client.ttsFromKana("コンニチワ", styleId)).rejects.toThrow(VoicevoxError);
    });

    it.skip("空のカナで音声合成しようとするとエラーが発生すること", async () => {
      await expect(client.ttsFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("カナからAudioQuery", () => {
    it("アクセント記号付きカナからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQueryFromKana(
        "ディイプラ'アニングワ/バンノ'オヤクデワ/アリマセ'ン",
        styleId,
      );

      expect(audioQuery).toBeDefined();
      expect(audioQuery).toMatchSnapshot();
    });

    it("カナから生成したAudioQueryで音声を合成できること", async () => {
      const audioQuery = await client.createAudioQueryFromKana("テ'スト", styleId);

      // パラメータを調整
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;

      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("AquesTalk風記法でないカナでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromKana("コンニチワ", styleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("空のカナでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("カナからアクセント句", () => {
    it("アクセント記号付きカナからアクセント句を生成できること", async () => {
      const accentPhrases = await client.createAccentPhrasesFromKana(
        "ディイプラ'アニングワ/バンノ'オヤクデワ/アリマセ'ン",
        styleId,
      );

      expect(accentPhrases).toBeDefined();
      expect(Array.isArray(accentPhrases)).toBe(true);
      expect(accentPhrases).toMatchSnapshot();
    });

    it("AquesTalk風記法でないカナでアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrasesFromKana("コンニチワ", styleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("空のカナでアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrasesFromKana("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });
});
