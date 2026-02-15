import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { analyzeWavAudio } from "./helpers/analyzeWavAudio.js";
import * as v from "valibot";
import { AudioQuerySchema } from "./helpers/schemas.js";

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

      const validationResult = v.safeParse(AudioQuerySchema, audioQuery);
      expect(validationResult.issues && v.flatten(validationResult.issues)).toBeUndefined();
    });

    it("複雑なテキストからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQuery(
        "今日は良い天気ですね。明日も晴れるでしょうか？",
        styleId,
      );

      const validationResult = v.safeParse(AudioQuerySchema, audioQuery);
      expect(validationResult.issues && v.flatten(validationResult.issues)).toBeUndefined();
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

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("pitchScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 音高を変更
      audioQuery.pitchScale = 0.8;
      expect(audioQuery.pitchScale).toBe(0.8);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("intonationScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 抑揚を変更
      audioQuery.intonationScale = 1.3;
      expect(audioQuery.intonationScale).toBe(1.3);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("volumeScaleを調整できること", async () => {
      const audioQuery = await client.createAudioQuery("テスト", styleId);

      // 音量を変更
      audioQuery.volumeScale = 0.8;
      expect(audioQuery.volumeScale).toBe(0.8);

      // 合成できることを確認
      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
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

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
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

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("synthesisOptionsを指定して合成できること", async () => {
      const audioQuery = await client.createAudioQuery("疑問文ですか？", styleId);
      const wav = await client.synthesize(audioQuery, styleId, {
        enableInterrogativeUpspeak: true,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("パラメータ調整後のAudioQueryから音声を合成できること", async () => {
      const audioQuery = await client.createAudioQuery("パラメータ調整テスト", styleId);

      // パラメータを調整
      audioQuery.speedScale = 1.2;
      audioQuery.pitchScale = 1.1;

      const wav = await client.synthesize(audioQuery, styleId);
      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });
  });

  describe("AudioQueryのアクセント句", () => {
    it("アクセント句が正しく生成されること", async () => {
      const audioQuery = await client.createAudioQuery("今日は良い天気です", styleId);

      const validationResult = v.safeParse(AudioQuerySchema, audioQuery);
      expect(validationResult.issues && v.flatten(validationResult.issues)).toBeUndefined();
    });

    it.skip("空のアクセント句配列からAudioQueryを生成しようとするとエラーが発生すること", async () => {
      await expect(client.createAudioQueryFromAccentPhrases([])).rejects.toThrow();
    });
  });
});
