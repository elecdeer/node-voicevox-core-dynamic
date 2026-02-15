import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

describe("AudioQuery E2E Tests", () => {
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

  describe("AudioQuery生成", () => {
    it("テキストからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQuery("こんにちは", styleId);

      expect(audioQuery).toBeDefined();
      expect(audioQuery).toMatchSnapshot();
    });

    it("複雑なテキストからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQuery(
        "今日は良い天気ですね。明日も晴れるでしょうか？",
        styleId,
      );

      expect(audioQuery).toBeDefined();
      expect(audioQuery).toMatchSnapshot();
    });

    it("無効なスタイルIDでAudioQueryを生成しようとするとエラーが発生すること", async () => {
      const invalidStyleId = 999999;
      await expect(client.createAudioQuery("テスト", invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });

    it.skip("空文字列でAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQuery("", styleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("AudioQueryパラメータ調整", () => {
    it("speedScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 話速を変更
      audioQuery.speedScale = 1.5;
      expect(audioQuery.speedScale).toBe(1.5);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("pitchScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 音高を変更
      audioQuery.pitchScale = 0.8;
      expect(audioQuery.pitchScale).toBe(0.8);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
    });

    it("intonationScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 抑揚を変更
      audioQuery.intonationScale = 1.3;
      expect(audioQuery.intonationScale).toBe(1.3);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
    });

    it("volumeScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 音量を変更
      audioQuery.volumeScale = 0.8;
      expect(audioQuery.volumeScale).toBe(0.8);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
    });

    it("複数のパラメータを同時に調整できること", async () => {
      const audioQuery = await client.createAudioQuery("こんにちは", styleId);

      // 複数パラメータを変更
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;
      audioQuery.intonationScale = 1.3;
      audioQuery.volumeScale = 1.0;

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
    });
  });

  describe("AudioQueryからの音声合成", () => {
    it("AudioQueryから音声を合成できること", async () => {
      const audioQuery = await client.createAudioQuery("合成テスト", styleId);
      const wav = await client.synthesize(audioQuery, styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'
    });

    it("synthesisOptionsを指定して合成できること", async () => {
      const audioQuery = await client.createAudioQuery("疑問文ですか？", styleId);
      const wav = await client.synthesize(audioQuery, styleId, {
        enableInterrogativeUpspeak: true,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("パラメータ調整後のAudioQueryから音声を合成できること", async () => {
      const audioQuery = await client.createAudioQuery("パラメータ調整テスト", styleId);

      // パラメータを調整
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;

      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("AudioQueryから合成したWAVファイルを出力できること", async () => {
      const audioQuery = await client.createAudioQuery("ファイル出力テスト", styleId);

      // パラメータを調整
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;
      audioQuery.intonationScale = 1.3;

      const wav = await client.synthesize(audioQuery, styleId);

      // outputディレクトリを作成
      await mkdir(paths.outputDir, { recursive: true });

      // WAVファイルを保存
      const outputPath = join(paths.outputDir, "audio-query-test.wav");
      await writeFile(outputPath, wav);

      // ファイルが作成されたことを確認
      const { stat } = await import("node:fs/promises");
      const stats = await stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("AudioQueryのアクセント句", () => {
    it("アクセント句が正しく生成されること", async () => {
      const audioQuery = await client.createAudioQuery("今日は良い天気です", styleId);

      console.log("AudioQuery:", JSON.stringify(audioQuery, null, 2));

      expect(audioQuery.accent_phrases).toBeDefined();
      expect(Array.isArray(audioQuery.accent_phrases)).toBe(true);
      expect(audioQuery.accent_phrases.length).toBeGreaterThan(0);

      const phrase = audioQuery.accent_phrases[0];
      expect(phrase.moras).toBeDefined();
      expect(Array.isArray(phrase.moras)).toBe(true);
      expect(phrase.moras.length).toBeGreaterThan(0);

      const mora = phrase.moras[0];
      expect(mora.text).toBeDefined();
      expect(mora.vowel).toBeDefined();
      expect(mora.vowel_length).toBeDefined();
      expect(mora.pitch).toBeDefined();
    });

    it.skip("空のアクセント句配列からAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromAccentPhrases([])).rejects.toThrow();
    });
  });
});
