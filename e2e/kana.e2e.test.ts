import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

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
    it("カナから音声を合成できること", async () => {
      const wav = await client.ttsFromKana("コンニチワ", styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'
    });

    it("アクセント記号付きカナから音声を合成できること", async () => {
      // アクセント句の区切りとアクセント位置を指定
      // '/'でアクセント句の区切り、アクセント位置は数字で指定
      const wav = await client.ttsFromKana("コ'ンニチワ/ボ'イスボックスデ_ス", styleId);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("TTSオプションを指定してカナから音声を合成できること", async () => {
      const wav = await client.ttsFromKana("ギモ'ンブンデ_スカ", styleId, {
        enableInterrogativeUpspeak: true,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);
    });

    it("カナTTSのWAVファイルを出力できること", async () => {
      const wav = await client.ttsFromKana("ファ'イルシュツリョクテ_スト", styleId);

      // outputディレクトリを作成
      await mkdir(paths.outputDir, { recursive: true });

      // WAVファイルを保存
      const outputPath = join(paths.outputDir, "kana-tts-test.wav");
      await writeFile(outputPath, wav);

      // ファイルが作成されたことを確認
      const { stat } = await import("node:fs/promises");
      const stats = await stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("カナからAudioQuery", () => {
    it("カナからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQueryFromKana("コンニチワ", styleId);

      expect(audioQuery).toBeDefined();
      expect(audioQuery.accentPhrases).toBeDefined();
      expect(Array.isArray(audioQuery.accentPhrases)).toBe(true);
      expect(audioQuery.accentPhrases.length).toBeGreaterThan(0);

      // パラメータの存在確認
      expect(audioQuery.speedScale).toBeDefined();
      expect(audioQuery.pitchScale).toBeDefined();
      expect(audioQuery.intonationScale).toBeDefined();
      expect(audioQuery.volumeScale).toBeDefined();
    });

    it("アクセント記号付きカナからAudioQueryを生成できること", async () => {
      const audioQuery = await client.createAudioQueryFromKana(
        "キョ'オワ/イ'イテ_ンキデ_ス",
        styleId,
      );

      expect(audioQuery).toBeDefined();
      expect(audioQuery.accentPhrases).toBeDefined();
      expect(audioQuery.accentPhrases.length).toBeGreaterThan(1); // 複数のアクセント句
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
  });

  describe("カナからアクセント句", () => {
    it("カナからアクセント句を生成できること", async () => {
      const accentPhrases = await client.createAccentPhrasesFromKana("コンニチワ", styleId);

      expect(accentPhrases).toBeDefined();
      expect(Array.isArray(accentPhrases)).toBe(true);
      expect(accentPhrases.length).toBeGreaterThan(0);

      const phrase = accentPhrases[0];
      expect(phrase.moras).toBeDefined();
      expect(Array.isArray(phrase.moras)).toBe(true);
      expect(phrase.moras.length).toBeGreaterThan(0);

      const mora = phrase.moras[0];
      expect(mora.text).toBeDefined();
      expect(mora.vowel).toBeDefined();
      expect(mora.vowelLength).toBeDefined();
      expect(mora.pitch).toBeDefined();
    });

    it("アクセント記号付きカナからアクセント句を生成できること", async () => {
      const accentPhrases = await client.createAccentPhrasesFromKana(
        "キョ'オワ/イ'イテ_ンキデ_ス",
        styleId,
      );

      expect(accentPhrases).toBeDefined();
      expect(accentPhrases.length).toBeGreaterThan(1); // 複数のアクセント句
    });
  });
});
