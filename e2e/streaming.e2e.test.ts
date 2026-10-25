import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import {
  createVoicevoxClient,
  closeVoiceModelFile,
  loadVoiceModel,
  openVoiceModelFile,
  VoicevoxError,
  VoicevoxOnExistingVoiceModelId,
  VoicevoxResultCode,
  VOICEVOX_FRAME_RATE,
  WAV_HEADER_LENGTH,
} from "../src/index.js";
import type { AudioQuery, VoicevoxClient } from "../src/index.js";
import { getEnvPaths } from "./helpers/env.js";
import { analyzeWavAudio } from "./helpers/analyzeWavAudio.js";

/** 1フレームあたりのPCMバイト数（24kHz・モノラル・16bit） */
const PCM_BYTES_PER_FRAME = 256 * 2;

describe("Streaming E2E Tests", () => {
  let client: VoicevoxClient;
  let styleId: number;
  let audioQuery: AudioQuery;
  const paths = getEnvPaths();

  beforeAll(async () => {
    client = await createVoicevoxClient({
      corePath: paths.corePath,
      onnxruntimePath: paths.onnxruntimePath,
      openJtalkDictDir: paths.openJtalkDictDir,
    });

    await client.loadVoiceModelFromPath(`${paths.modelsPath}/0.vvm`);
    const speakers = client.getLoadedSpeakers();
    styleId = speakers[0].styles[0].id;
    audioQuery = await client.createAudioQuery("こんにちは、ストリーミング音声合成です。", styleId);
  });

  afterAll(() => {
    client?.close();
  });

  describe("フレーム長", () => {
    it("AudioQueryの総フレーム数と中間表現の長さが一致すること", async () => {
      const frameLength = client.getAudioQueryFrameLength(audioQuery);
      expect(frameLength).toBeGreaterThan(0);
      expect(client.functions.voicevox_get_frame_rate()).toBe(VOICEVOX_FRAME_RATE);

      using audioFeature = await client.createAudioFeature(audioQuery, styleId);
      expect(audioFeature.length).toBe(frameLength);
    });
  });

  describe("ストリーミング音声合成", () => {
    it("WAVヘッダとPCMを少しずつ生成し、連結すると有意な音声になること", async () => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of client.streamingSynthesis(audioQuery, styleId)) {
        chunks.push(chunk);
      }

      const frameLength = client.getAudioQueryFrameLength(audioQuery);
      const [header, ...pcms] = chunks;
      expect(header.byteLength).toBe(WAV_HEADER_LENGTH);
      // デフォルトは28フレームずつ
      expect(pcms).toHaveLength(Math.ceil(frameLength / 28));

      const pcmLength = pcms.reduce((sum, pcm) => sum + pcm.byteLength, 0);
      expect(pcmLength).toBe(frameLength * PCM_BYTES_PER_FRAME);
      expect(Buffer.from(header).readUInt32LE(40)).toBe(pcmLength);

      const wav = Buffer.concat(chunks);
      expect(analyzeWavAudio(wav).isMeaningful).toBe(true);

      // 一括の音声合成と同じ長さのWAVになる
      const synthesized = await client.synthesize(audioQuery, styleId);
      expect(wav.byteLength).toBe(synthesized.byteLength);
    });

    it("区切り方を指定できること", async () => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of client.streamingSynthesis(audioQuery, styleId, {
        startOffsetInSecs: 0.5,
        segmentLengthInSecs: 0.1,
      })) {
        chunks.push(chunk);
      }

      const frameLength = client.getAudioQueryFrameLength(audioQuery);
      const startOffsetFrames = Math.round(0.5 * VOICEVOX_FRAME_RATE);
      const segmentFrames = Math.round(0.1 * VOICEVOX_FRAME_RATE);
      const [, ...pcms] = chunks;
      expect(pcms).toHaveLength(Math.ceil((frameLength - startOffsetFrames) / segmentFrames));
      expect(pcms[0].byteLength).toBe(segmentFrames * PCM_BYTES_PER_FRAME);
    });
  });

  describe("AudioFeature", () => {
    it("区間ごとにPCMを生成できること", async () => {
      using audioFeature = await client.createAudioFeature(audioQuery, styleId);

      const pcm = await audioFeature.render(10, 40);
      expect(pcm.byteLength).toBe(30 * PCM_BYTES_PER_FRAME);

      const whole = await audioFeature.render();
      expect(whole.byteLength).toBe(audioFeature.length * PCM_BYTES_PER_FRAME);

      expect((await audioFeature.render(5, 5)).byteLength).toBe(0);
    });

    it("範囲外の区間を指定するとエラーが発生すること", async () => {
      using audioFeature = await client.createAudioFeature(audioQuery, styleId);

      await expect(audioFeature.render(0, audioFeature.length + 1)).rejects.toMatchObject({
        code: VoicevoxResultCode.EndOutOfBoundsError,
      });
      await expect(audioFeature.render(audioFeature.length + 1)).rejects.toThrow(VoicevoxError);
    });
  });

  describe("音声モデルのロードオプション", () => {
    it("同じIDのモデルを読み込むときのふるまいを指定できること", async () => {
      const model = await openVoiceModelFile(client.functions, `${paths.modelsPath}/0.vvm`);
      try {
        await expect(
          loadVoiceModel(client.functions, client.synthesizerHandle, model),
        ).rejects.toMatchObject({ code: VoicevoxResultCode.ModelAlreadyLoadedError });

        await loadVoiceModel(client.functions, client.synthesizerHandle, model, {
          onExisting: VoicevoxOnExistingVoiceModelId.Skip,
        });
        await loadVoiceModel(client.functions, client.synthesizerHandle, model, {
          onExisting: VoicevoxOnExistingVoiceModelId.Reload,
        });
      } finally {
        closeVoiceModelFile(client.functions, model);
      }

      // 再読み込み後も音声合成できる
      const wav = await client.tts("テスト", styleId);
      expect(analyzeWavAudio(wav).isMeaningful).toBe(true);
    });
  });
});
