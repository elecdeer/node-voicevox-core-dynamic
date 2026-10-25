/**
 * ストリーミング音声合成関連API
 *
 * AudioQueryから音声合成用の中間表現（AudioFeature）を作り、その一部の区間ずつ
 * PCMを生成することで、音声を少しずつ合成する。
 *
 * C APIには`streaming_synthesis`が存在しないため、`create_audio_feature`と`render`を
 * 組み合わせてRust/Python APIの`streaming_synthesis`と同じ振る舞いを再現している。
 *
 * @see https://github.com/VOICEVOX/voicevox_core/blob/main/docs/guide/user/usage.md#ストリーミング音声合成
 */

import { VoicevoxError } from "../errors/voicevox-error.js";
import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import {
  AUDIO_FEATURE_SLICE_SIZE,
  allocOutPointer,
  readBytes,
  readOutPointer,
  readOutSize,
  NULL_POINTER,
} from "../ffi/native.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { AudioFeatureHandle, OutBytesHandle, SynthesizerHandle } from "../types/handles.js";
import type { AudioQuery } from "../types/models.js";
import type {
  AudioQueryFrameLengthOptions,
  StreamingSynthesisOptions,
  SynthesisOptions,
} from "../types/options.js";

/**
 * フレームレート（フレーム数/秒）
 *
 * 音声の秒数は`frameLength / VOICEVOX_FRAME_RATE`で表せる。
 */
export const VOICEVOX_FRAME_RATE = 93.75;

/**
 * `streamingSynthesis`が最初に返すWAVヘッダのバイト長
 */
export const WAV_HEADER_LENGTH = 44;

/** 1フレームあたりの音声波形のサンプル数（24kHz） */
const WAVE_SAMPLES_PER_FRAME = 256;

/** 音声合成モデルが出力するサンプリングレート */
const DEFAULT_SAMPLING_RATE = 24000;

/** `StreamingSynthesisOptions.segmentLengthInSecs`のデフォルト値（約28フレーム） */
const DEFAULT_SEGMENT_LENGTH_IN_SECS = 0.3;

/**
 * 結果コードが成功でなければVoicevoxErrorを投げる
 */
function throwIfError(functions: VoicevoxCoreFunctions, resultCode: VoicevoxResultCode): void {
  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * IEEE 754の`roundToIntegralTiesToEven`で整数に丸める
 *
 * voicevox_coreのフレーム数換算（Rustの`round_ties_even`）に合わせるため、
 * 0.5を常に切り上げる`Math.round`は使えない。
 */
function roundTiesEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff < 0.5) {
    return floor;
  }
  if (diff > 0.5) {
    return floor + 1;
  }
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * フレーム番号の引数を検証する
 */
function assertFrameIndex(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, got ${value}`);
  }
}

/**
 * ストリーミング音声合成の区切り方を秒からフレーム数に換算する
 *
 * voicevox_coreの`AudioSegmentation::to_frames`の移植。
 *
 * @param frameLength - 音声の総フレーム数
 * @param options - ストリーミング音声合成オプション
 * @returns 開始フレームと、一度に生成するフレーム数
 * @throws {RangeError} 範囲外の値が指定された場合
 */
export function toSegmentFrames(
  frameLength: number,
  options?: Pick<StreamingSynthesisOptions, "startOffsetInSecs" | "segmentLengthInSecs">,
): { startOffsetFrames: number; segmentFrames: number } {
  const startOffset = (options?.startOffsetInSecs ?? 0) * VOICEVOX_FRAME_RATE;
  if (!(startOffset >= 0 && startOffset <= frameLength)) {
    throw new RangeError(
      `startOffsetInSecs in frames must be positive and must not exceed the length of the audio (${frameLength} frames)`,
    );
  }

  const segmentLength = roundTiesEven(
    (options?.segmentLengthInSecs ?? DEFAULT_SEGMENT_LENGTH_IN_SECS) * VOICEVOX_FRAME_RATE,
  );
  // RustのNaN・負数→usize変換（0に飽和）と同様に、1未満はすべて不正とする
  if (!(segmentLength >= 1)) {
    throw new RangeError(`segmentLengthInSecs * ${VOICEVOX_FRAME_RATE} must be greater than 0.5`);
  }

  return { startOffsetFrames: roundTiesEven(startOffset), segmentFrames: segmentLength };
}

/**
 * フレームレートをC APIから取得する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @returns フレームレート（`VOICEVOX_FRAME_RATE`と同じ値）
 */
export function getFrameRate(functions: VoicevoxCoreFunctions): number {
  return functions.voicevox_get_frame_rate();
}

/**
 * AudioQueryから音声の総フレーム数を算出する
 *
 * 音声の秒数は、フレーム数を`VOICEVOX_FRAME_RATE`で割った値で表せる。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param audioQuery - AudioQuery
 * @param options - 算出オプション
 * @returns 総フレーム数
 * @throws {VoicevoxError} AudioQueryが不正な場合
 */
export function getAudioQueryFrameLength(
  functions: VoicevoxCoreFunctions,
  audioQuery: AudioQuery,
  options?: AudioQueryFrameLengthOptions,
): number {
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ??
    functions.voicevox_make_default_audio_query_frame_length_options();

  const outFrameLength = allocOutPointer();
  const resultCode = functions.voicevox_audio_query_frame_length(
    JSON.stringify(audioQuery),
    enableInterrogativeUpspeak,
    outFrameLength,
  );
  throwIfError(functions, resultCode);

  return readOutSize(outFrameLength);
}

/**
 * AudioQueryから音声合成用の中間表現を構築する
 *
 * 使い終わったら`deleteAudioFeature`で破棄すること。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param audioQuery - AudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns Promise<中間表現ハンドル>
 * @throws {VoicevoxError} 構築に失敗した場合
 */
export async function createAudioFeature(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  audioQuery: AudioQuery,
  styleId: number,
  options?: SynthesisOptions,
): Promise<AudioFeatureHandle> {
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ?? functions.voicevox_make_default_synthesis_options();

  const outAudioFeature = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_create_audio_feature.async(
    synthesizer,
    JSON.stringify(audioQuery),
    styleId,
    enableInterrogativeUpspeak,
    outAudioFeature,
  );
  throwIfError(functions, resultCode);

  const handle = readOutPointer(outAudioFeature);
  if (handle === NULL_POINTER) {
    throw new Error("Failed to create audio feature: null handle returned");
  }

  return handle as AudioFeatureHandle;
}

/**
 * 中間表現の総フレーム数を取得する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param audioFeature - 中間表現ハンドル
 * @returns 総フレーム数
 */
export function getAudioFeatureLength(
  functions: VoicevoxCoreFunctions,
  audioFeature: AudioFeatureHandle,
): number {
  return Number(functions.voicevox_audio_feature_len(audioFeature));
}

/**
 * 中間表現を破棄する
 *
 * 破棄後のハンドルを使用するとプロセスが異常終了するため注意すること。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param audioFeature - 中間表現ハンドル
 */
export function deleteAudioFeature(
  functions: VoicevoxCoreFunctions,
  audioFeature: AudioFeatureHandle,
): void {
  functions.voicevox_audio_feature_delete(audioFeature);
}

/**
 * 中間表現の指定区間から16bit PCM（signed 16-bit little endian）を生成する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param audioFeature - 中間表現ハンドル
 * @param start - 開始フレーム番号（含む）
 * @param end - 終了フレーム番号（含まない）。省略時は末尾まで
 * @returns Promise<PCMデータ>
 * @throws {VoicevoxError} 区間が範囲外の場合、または生成に失敗した場合
 */
export async function renderAudioFeature(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  audioFeature: AudioFeatureHandle,
  start = 0,
  end?: number,
): Promise<Uint8Array> {
  const endFrame = end ?? getAudioFeatureLength(functions, audioFeature);
  assertFrameIndex("start", start);
  assertFrameIndex("end", endFrame);

  // 範囲の検証はvoicevox_audio_feature_sliceに任せ、出力された構造体をそのまま渡す
  const slice = Buffer.alloc(AUDIO_FEATURE_SLICE_SIZE);
  throwIfError(
    functions,
    functions.voicevox_audio_feature_slice(
      audioFeature,
      BigInt(start),
      BigInt(endFrame),
      false,
      false,
      false,
      slice,
    ),
  );

  const outLength = allocOutPointer();
  const outPcm = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_render.async(
    synthesizer,
    slice,
    outLength,
    outPcm,
  );
  throwIfError(functions, resultCode);

  const length = readOutSize(outLength);
  if (length === 0) {
    // 0バイトのときはvoicevox_empty_bytesが書き込まれており、解放してはならない
    return new Uint8Array(0);
  }

  const pcmPtr = readOutPointer(outPcm) as OutBytesHandle;
  const pcm = readBytes(pcmPtr, length);
  functions.voicevox_bytes_free(pcmPtr);

  return pcm;
}

/**
 * 16bit PCMのバイト長に対応したWAVファイルの先頭部分（ヘッダ）を作成する
 *
 * `streamingSynthesis`が最初に返すヘッダと同じもの。
 *
 * @param pcmLength - 後続するPCMデータの総バイト長
 * @param samplingRate - サンプリングレート
 * @param isStereo - ステレオかどうか
 * @returns `WAV_HEADER_LENGTH`バイトのWAVヘッダ
 */
export function createWavHeader(
  pcmLength: number,
  samplingRate: number,
  isStereo: boolean,
): Uint8Array {
  const numChannels = isStereo ? 2 : 1;
  const bitDepth = 16;
  const blockSize = (bitDepth * numChannels) / 8;

  const header = Buffer.alloc(WAV_HEADER_LENGTH);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(WAV_HEADER_LENGTH + pcmLength - 8, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16); // fmtチャンクの長さ
  header.writeUInt16LE(1, 20); // リニアPCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(samplingRate, 24);
  header.writeUInt32LE(samplingRate * blockSize, 28);
  header.writeUInt16LE(blockSize, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcmLength, 40);

  return new Uint8Array(header.buffer, header.byteOffset, header.byteLength);
}

/**
 * 16bit PCM（signed 16-bit little endian）からWAV形式のバイナリを生成する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param pcm - PCMデータ
 * @param samplingRate - サンプリングレート
 * @param isStereo - ステレオかどうか
 * @returns WAVデータ
 */
export function wavFromS16le(
  functions: VoicevoxCoreFunctions,
  pcm: Uint8Array,
  samplingRate: number,
  isStereo: boolean,
): Uint8Array {
  // pcmは長さ0でも非ヌルでなければならないため、空のときはダミーの1バイトを渡す
  const pcmBuffer = pcm.byteLength === 0 ? new Uint8Array(1) : pcm;

  const outLength = allocOutPointer();
  const outWav = allocOutPointer();
  functions.voicevox_wav_from_s16le(
    pcm.byteLength,
    pcmBuffer,
    samplingRate,
    isStereo,
    outLength,
    outWav,
  );

  const wavPtr = readOutPointer(outWav) as OutBytesHandle;
  const wav = readBytes(wavPtr, readOutSize(outLength));
  functions.voicevox_bytes_free(wavPtr);

  return wav;
}

/**
 * AudioQueryから音声を少しずつ合成する（ストリーミング音声合成）
 *
 * 最初の要素はWAVの先頭部分（`WAV_HEADER_LENGTH`バイトのヘッダ）で、以降は
 * 16bit PCMを`segmentLengthInSecs`ずつ返す。すべての要素を連結するとWAVファイルになる。
 *
 * 消費側がチャンクを処理している間も合成を進められるよう、常に1区間先のPCMを
 * 先読みして生成する。
 *
 * 中間表現は反復の終了時（`break`や例外を含む）に、先読み中の生成の完了を待ってから
 * 破棄される。反復を途中で放棄する場合は`return()`を呼ぶこと（`for await`の`break`では
 * 自動で呼ばれる）。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param audioQuery - AudioQuery
 * @param styleId - スタイルID
 * @param options - ストリーミング音声合成オプション
 * @returns WAVヘッダとPCMデータを順に返すAsyncGenerator
 * @throws {RangeError} 区切り方の指定が範囲外の場合
 * @throws {VoicevoxError} 合成に失敗した場合
 *
 * @example
 * ```typescript
 * const stream = streamingSynthesis(functions, synthesizer, audioQuery, styleId);
 * for await (const chunk of stream) {
 *   // 1つ目はWAVヘッダ、以降はPCM
 *   output.write(chunk);
 * }
 * ```
 */
export async function* streamingSynthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  audioQuery: AudioQuery,
  styleId: number,
  options?: StreamingSynthesisOptions,
): AsyncGenerator<Uint8Array, void, undefined> {
  const enableInterrogativeUpspeak =
    options?.enableInterrogativeUpspeak ?? functions.voicevox_make_default_synthesis_options();

  // 中間表現の構築前に区切り方を検証する
  const frameLength = getAudioQueryFrameLength(functions, audioQuery, {
    enableInterrogativeUpspeak,
  });
  const { startOffsetFrames, segmentFrames } = toSegmentFrames(frameLength, options);

  const audioFeature = await createAudioFeature(functions, synthesizer, audioQuery, styleId, {
    enableInterrogativeUpspeak,
  });
  /** 先読み中の区間のPCM */
  let prefetched: Promise<Uint8Array> | undefined;
  try {
    const fullFrames = getAudioFeatureLength(functions, audioFeature);
    const numChannels = audioQuery.outputStereo ? 2 : 1;
    const repeatCount =
      Math.floor(audioQuery.outputSamplingRate / DEFAULT_SAMPLING_RATE) * numChannels;
    const pcmLength = (fullFrames - startOffsetFrames) * WAVE_SAMPLES_PER_FRAME * repeatCount * 2;

    /**
     * startから始まる区間の生成を開始する。区間がなければundefined
     */
    const startRender = (start: number): Promise<Uint8Array> | undefined => {
      if (start >= fullFrames) {
        return undefined;
      }
      const end = Math.min(start + segmentFrames, fullFrames);
      const pcm = renderAudioFeature(functions, synthesizer, audioFeature, start, end);
      // 先読み中に失敗しても、消費側がawaitするまではunhandled rejectionにしない
      pcm.catch(() => {});
      return pcm;
    };

    // ヘッダを処理している間に最初の区間の生成を始める
    prefetched = startRender(startOffsetFrames);
    yield createWavHeader(pcmLength, audioQuery.outputSamplingRate, audioQuery.outputStereo);

    for (let start = startOffsetFrames; prefetched !== undefined; start += segmentFrames) {
      const current = prefetched;
      // Workerは直列に実行するため、currentの完了直後にこの区間の生成が始まる。
      // 先読みを1区間に限ることで、消費側がチャンクを受け取った時点で未開始の呼び出しが
      // キューに残らず、クライアントのclose()（実行中の呼び出しの完了を待つ）と競合しない
      prefetched = startRender(start + segmentFrames);
      yield await current;
    }
  } finally {
    // 破棄後のアクセスはプロセスを異常終了させるため、先読み中のrenderの完了を待つ
    await prefetched?.catch(() => {});
    deleteAudioFeature(functions, audioFeature);
  }
}
