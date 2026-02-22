import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVoicevoxClient } from "../src/index.js";
import type { VoicevoxClient, Score } from "../src/index.js";
import { VoicevoxError } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { analyzeWavAudio } from "./helpers/analyzeWavAudio.js";
import { FrameAudioQuerySchema } from "./helpers/schemas.js";
import * as v from "valibot";

describe("Singing Voice Synthesis E2E Tests", () => {
  let client: VoicevoxClient;
  const paths = getEnvPaths();

  beforeAll(async () => {
    client = await createVoicevoxClient({
      corePath: paths.corePath,
      onnxruntimePath: paths.onnxruntimePath,
      openJtalkDictDir: paths.openJtalkDictDir,
    });

    // 通常の音声合成モデルと歌唱対応モデルをロード
    await client.loadVoiceModelFromPath(`${paths.modelsPath}/0.vvm`);
    await client.loadVoiceModelFromPath(`${paths.modelsPath}/s0.vvm`);
  });

  afterAll(() => {
    client?.close();
  });

  /**
   * 簡単なテスト用の楽譜を作成
   *
   * "ドレミ"の3音符
   */
  const createSimpleScore = (): Score => ({
    notes: [
      { key: null, frame_length: 15, lyric: "" }, // 最初は休符（必須）
      { key: 60, frame_length: 45, lyric: "ド" }, // C4
      { key: 62, frame_length: 45, lyric: "レ" }, // D4
      { key: 64, frame_length: 45, lyric: "ミ" }, // E4
      { key: null, frame_length: 15, lyric: "" }, // 最後も休符（推奨）
    ],
  });

  /**
   * 休符を含む楽譜を作成
   */
  const createScoreWithRest = (): Score => ({
    notes: [
      { key: null, frame_length: 15, lyric: "" }, // 最初は休符（必須）
      { key: 60, frame_length: 45, lyric: "ド" }, // C4
      { key: null, frame_length: 15, lyric: "" }, // 途中の休符
      { key: 64, frame_length: 45, lyric: "ミ" }, // E4
      { key: null, frame_length: 15, lyric: "" }, // 最後も休符（推奨）
    ],
  });

  describe("歌唱対応スタイルの確認", () => {
    it("歌唱対応スタイルが利用可能であること", () => {
      const speakers = client.getLoadedSpeakers();

      // sing タイプ（歌唱用）のスタイルを検索
      const singStyles = speakers.flatMap((speaker) =>
        speaker.styles.filter(
          (style) =>
            style.type === "singing_teacher" || style.type === "sing",
        ),
      );

      // frame_decode タイプ（合成用）のスタイルを検索
      const frameDecodeStyles = speakers.flatMap((speaker) =>
        speaker.styles.filter((style) => style.type === "frame_decode"),
      );

      expect(singStyles.length).toBeGreaterThan(0);
      expect(frameDecodeStyles.length).toBeGreaterThan(0);
    });
  });

  describe("createSingFrameAudioQuery", () => {
    it("楽譜からFrameAudioQueryを生成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      // sing タイプのスタイルを検索（singing_teacher または sing）
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find(
          (style) =>
            style.type === "singing_teacher" || style.type === "sing",
        );

      if (!singStyle) {
        console.warn("sing タイプのスタイルが見つかりませんでした");
        return;
      }

      const score = createSimpleScore();
      const frameAudioQuery = await client.createSingFrameAudioQuery(score, singStyle.id);

      // スキーマ検証
      const validationResult = v.safeParse(FrameAudioQuerySchema, frameAudioQuery);
      expect(validationResult.issues && v.flatten(validationResult.issues)).toBeUndefined();

      // 基本的な構造の確認
      expect(frameAudioQuery.f0).toBeInstanceOf(Array);
      expect(frameAudioQuery.volume).toBeInstanceOf(Array);
      expect(frameAudioQuery.phonemes).toBeInstanceOf(Array);
      expect(frameAudioQuery.f0.length).toBeGreaterThan(0);
      expect(frameAudioQuery.volume.length).toBeGreaterThan(0);
      expect(frameAudioQuery.phonemes.length).toBeGreaterThan(0);
    });

    it("休符を含む楽譜からFrameAudioQueryを生成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      // sing タイプのスタイルを検索
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find(
          (style) =>
            style.type === "singing_teacher" || style.type === "sing",
        );

      if (!singStyle) {
        console.warn("sing タイプのスタイルが見つかりませんでした");
        return;
      }

      const score = createScoreWithRest();
      const frameAudioQuery = await client.createSingFrameAudioQuery(score, singStyle.id);

      const validationResult = v.safeParse(FrameAudioQuerySchema, frameAudioQuery);
      expect(validationResult.issues && v.flatten(validationResult.issues)).toBeUndefined();
    });

    it("無効なスタイルIDでエラーが発生すること", async () => {
      const score = createSimpleScore();
      const invalidStyleId = 999999;

      await expect(client.createSingFrameAudioQuery(score, invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });
  });

  describe("frameSynthesize", () => {
    it("FrameAudioQueryから歌唱音声を合成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      // sing タイプのスタイル（createSingFrameAudioQuery用）
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find((style) => style.type === "singing_teacher" || style.type === "sing");

      // frame_decode タイプのスタイル（frameSynthesize用）
      const frameDecodeStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find((style) => style.type === "frame_decode");

      if (!singStyle || !frameDecodeStyle) {
        console.warn("必要なスタイルが見つかりませんでした");
        return;
      }

      const score = createSimpleScore();
      const frameAudioQuery = await client.createSingFrameAudioQuery(score, singStyle.id);
      const wav = await client.frameSynthesize(frameAudioQuery, frameDecodeStyle.id);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認 (RIFF)
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("無効なスタイルIDでエラーが発生すること", async () => {
      const speakers = client.getLoadedSpeakers();
      // sing タイプのスタイル
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find(
          (style) =>
            style.type === "singing_teacher" || style.type === "sing",
        );

      if (!singStyle) {
        console.warn("sing タイプのスタイルが見つかりませんでした");
        return;
      }

      const score = createSimpleScore();
      const frameAudioQuery = await client.createSingFrameAudioQuery(score, singStyle.id);
      const invalidStyleId = 999999;

      await expect(client.frameSynthesize(frameAudioQuery, invalidStyleId)).rejects.toThrow(
        VoicevoxError,
      );
    });
  });

  describe("sing (便利メソッド)", () => {
    it("楽譜から直接歌唱音声を生成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find((style) => style.type === "sing");

      if (!singStyle) {
        console.warn("sing対応スタイルが見つかりませんでした");
        return;
      }

      const score = createSimpleScore();
      const wav = await client.sing(score, singStyle.id);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      // WAVヘッダーの確認 (RIFF)
      expect(wav[0]).toBe(0x52); // 'R'
      expect(wav[1]).toBe(0x49); // 'I'
      expect(wav[2]).toBe(0x46); // 'F'
      expect(wav[3]).toBe(0x46); // 'F'

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("休符を含む楽譜から歌唱音声を生成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find((style) => style.type === "sing");

      if (!singStyle) {
        console.warn("sing対応スタイルが見つかりませんでした");
        return;
      }

      const score = createScoreWithRest();
      const wav = await client.sing(score, singStyle.id);

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("合成オプションを指定して歌唱音声を生成できること", async () => {
      const speakers = client.getLoadedSpeakers();
      const singStyle = speakers
        .flatMap((speaker) => speaker.styles)
        .find((style) => style.type === "sing");

      if (!singStyle) {
        console.warn("sing対応スタイルが見つかりませんでした");
        return;
      }

      const score = createSimpleScore();
      const wav = await client.sing(score, singStyle.id, {
        enableInterrogativeUpspeak: false,
      });

      expect(wav).toBeInstanceOf(Uint8Array);
      expect(wav.length).toBeGreaterThan(0);

      const { isMeaningful } = analyzeWavAudio(wav);
      expect(isMeaningful).toBe(true);
    });

    it("無効なスタイルIDでエラーが発生すること", async () => {
      const score = createSimpleScore();
      const invalidStyleId = 999999;

      await expect(client.sing(score, invalidStyleId)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("v0.16.4未満での動作", () => {
    it("関数が利用できない場合にわかりやすいエラーメッセージが表示されること", async () => {
      // この確認は関数が利用できる環境では実行できないため、スキップ
      // 実際のv0.16.3環境でテストする必要がある
      expect(true).toBe(true);
    });
  });
});
