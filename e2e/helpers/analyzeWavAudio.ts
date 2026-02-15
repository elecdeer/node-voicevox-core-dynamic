/**
 * WAVデータの統計情報を計算し、有意な音声か判定する
 */
export const analyzeWavAudio = (wavData: Uint8Array) => {
  // 1. WAVヘッダー(44bytes)をスキップして16bit PCMとして取得
  const DATA_OFFSET = 44;
  const dataView = new DataView(wavData.buffer, wavData.byteOffset, wavData.byteLength);

  const samples: number[] = [];
  for (let i = DATA_OFFSET; i < wavData.byteLength; i += 2) {
    // 範囲外アクセス防止
    if (i + 1 >= wavData.byteLength) break;
    const sample = dataView.getInt16(i, true);
    samples.push(sample / 32768.0); // -1.0 ~ 1.0に正規化
  }

  if (samples.length === 0) {
    throw new Error("WAV data is empty or header is invalid.");
  }

  // 2. RMS (音量) の計算
  const sumSquare = samples.reduce((acc, val) => acc + val * val, 0);
  const rms = Math.sqrt(sumSquare / samples.length);

  // 3. ZCR (ゼロ交差率) の計算
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
      crossings++;
    }
  }
  const zcr = crossings / (samples.length - 1);

  // 4. 判定 (合成音声向けの標準的な閾値)
  // rms > 0.01: 非常に小さい音も拾う場合はこのくらい。通常は0.02以上を推奨。
  // zcr < 0.4: ホワイトノイズ（通常0.5以上）を除外。
  const isMeaningful = rms > 0.01 && zcr < 0.4;

  return {
    rms,
    zcr,
    isMeaningful,
    analysis: {
      isSilence: rms < 0.005,
      isNoise: zcr > 0.45,
    },
  };
};
