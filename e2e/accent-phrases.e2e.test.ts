import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient, AudioQuery } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

describe("Accent Phrases E2E Tests", () => {
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

  describe("テキストからアクセント句生成", () => {
    it("テキストからアクセント句を生成できること", async () => {
      const accentPhrases = await client.createAccentPhrases("こんにちは", styleId);

      expect(accentPhrases).toBeDefined();
      expect(Array.isArray(accentPhrases)).toBe(true);
      expect(accentPhrases).toMatchSnapshot();
    });

    it("複雑なテキストから複数のアクセント句を生成できること", async () => {
      const accentPhrases = await client.createAccentPhrases("今日は良い天気です", styleId);

      expect(accentPhrases).toBeDefined();
      expect(Array.isArray(accentPhrases)).toBe(true);
      expect(accentPhrases).toMatchSnapshot();
    });

    it("アクセント句の構造が正しいこと", async () => {
      const accentPhrases = await client.createAccentPhrases("テスト", styleId);

      expect(accentPhrases).toBeDefined();
      expect(Array.isArray(accentPhrases)).toBe(true);
      expect(accentPhrases).toMatchSnapshot();
    });

    it("無効なスタイルIDでアクセント句を生成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.createAccentPhrases("テスト", invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("空文字列でアクセント句を生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAccentPhrases("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("アクセント句からAudioQuery生成", () => {
    it("アクセント句からAudioQueryを生成できること", async () => {
      const accentPhrases = await client.createAccentPhrases("こんにちは", styleId);
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);

      expect(audioQuery).toBeDefined();
      expect(audioQuery).toMatchSnapshot();
    });

    it("生成したAudioQueryから音声を合成できること", async () => {
      const accentPhrases = await client.createAccentPhrases("合成テスト", styleId);
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });
  });

  describe("アクセント句の操作", () => {
    it("アクセント位置を変更できること", async () => {
      const accentPhrases = await client.createAccentPhrases("こんにちは", styleId);

      // アクセント位置を変更
      const originalAccent = accentPhrases[0].accent;
      accentPhrases[0].accent = 1;
      expect(accentPhrases[0].accent).toBe(1);
      expect(accentPhrases[0].accent).not.toBe(originalAccent);

      // 変更後のアクセント句で音声を合成
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("モーラの音高を変更できること", async () => {
      const accentPhrases = await client.createAccentPhrases("テスト", styleId);

      // 最初のモーラの音高を変更
      const originalPitch = accentPhrases[0].moras[0].pitch;
      accentPhrases[0].moras[0].pitch = 5.0;
      expect(accentPhrases[0].moras[0].pitch).toBe(5.0);
      expect(accentPhrases[0].moras[0].pitch).not.toBe(originalPitch);

      // 変更後のアクセント句で音声を合成
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("モーラの長さを変更できること", async () => {
      const accentPhrases = await client.createAccentPhrases("テスト", styleId);

      // 最初のモーラの長さを変更
      const originalLength = accentPhrases[0].moras[0].vowel_length;
      accentPhrases[0].moras[0].vowel_length = 0.2;
      expect(accentPhrases[0].moras[0].vowel_length).toBe(0.2);
      expect(accentPhrases[0].moras[0].vowel_length).not.toBe(originalLength);

      // 変更後のアクセント句で音声を合成
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("複数の変更を組み合わせて適用できること", async () => {
      const accentPhrases = await client.createAccentPhrases("こんにちは", styleId);

      // アクセント位置を変更
      accentPhrases[0].accent = 2;

      // モーラのパラメータを変更
      accentPhrases[0].moras[0].pitch = 5.5;
      accentPhrases[0].moras[0].vowel_length = 0.15;

      // AudioQueryを生成して音声合成
      const audioQuery = await client.createAudioQueryFromAccentPhrases(accentPhrases);

      // AudioQueryのパラメータも調整
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;

      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVファイルを出力
      await mkdir(paths.outputDir, { recursive: true });
      const outputPath = join(paths.outputDir, "accent-phrases-modified-test.wav");
      await writeFile(outputPath, wav);

      const { stat } = await import("node:fs/promises");
      const stats = await stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("アクセント句の結合", () => {
    it("複数のテキストからアクセント句を生成して結合できること", async () => {
      const phrases1 = await client.createAccentPhrases("こんにちは", styleId);
      const phrases2 = await client.createAccentPhrases("さようなら", styleId);

      // アクセント句を結合
      const combinedPhrases: AudioQuery["accent_phrases"] = [...phrases1, ...phrases2];

      // 結合したアクセント句からAudioQueryを生成
      const audioQuery = await client.createAudioQueryFromAccentPhrases(combinedPhrases);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });
  });
});
