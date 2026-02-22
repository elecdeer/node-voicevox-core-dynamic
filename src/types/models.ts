/**
 * データモデル型定義
 */

/**
 * モーラ
 *
 * 音韻の最小単位
 */
export interface Mora {
  /** テキスト */
  text: string;
  /** 子音の音素 */
  consonant: string | null;
  /** 子音の音長 */
  consonant_length: number | null;
  /** 母音の音素 */
  vowel: string;
  /** 母音の音長 */
  vowel_length: number;
  /** 音高 */
  pitch: number;
}

/**
 * アクセント句
 */
export interface AccentPhrase {
  /** モーラの配列 */
  moras: Mora[];
  /** アクセント位置 */
  accent: number;
  /** 後続する無音のモーラ */
  pause_mora: Mora | null;
  /** 疑問文かどうか */
  is_interrogative: boolean;
}

/**
 * AudioQuery
 *
 * 音声合成用のクエリ
 *
 * camelCaseとsnake_caseが混在しているのは、APIの仕様に合わせているためです。
 */
export interface AudioQuery {
  /** アクセント句の配列 */
  accent_phrases: AccentPhrase[];
  /** 全体の話速 */
  speedScale: number;
  /** 全体の音高 */
  pitchScale: number;
  /** 全体の抑揚 */
  intonationScale: number;
  /** 全体の音量 */
  volumeScale: number;
  /** 音声の前の無音時間 */
  prePhonemeLength: number;
  /** 音声の後の無音時間 */
  postPhonemeLength: number;
  /** 音声データの出力サンプリングレート */
  outputSamplingRate: number;
  /** 音声データをステレオ出力するか */
  outputStereo: boolean;
  /** [読み取り専用] AquesTalk風記法 */
  kana?: string;
}

/**
 * Note
 *
 * 歌唱音声合成の音符
 */
export interface Note {
  /** MIDIノート番号 (休符の場合はnull) */
  key: number | null;
  /** フレーム長 */
  frame_length: number;
  /** 歌詞 (休符の場合は空文字) */
  lyric: string;
}

/**
 * Score
 *
 * 歌唱音声合成の楽譜
 */
export interface Score {
  /** 音符の配列 */
  notes: Note[];
}

/**
 * FramePhoneme
 *
 * フレームごとの音素
 */
export interface FramePhoneme {
  /** 音素 */
  phoneme: string;
  /** フレーム長 */
  frame_length: number;
}

/**
 * FrameAudioQuery
 *
 * 歌唱音声合成用のクエリ
 *
 * camelCaseとsnake_caseが混在しているのは、APIの仕様に合わせているためです。
 */
export interface FrameAudioQuery {
  /** フレームごとの基本周波数 */
  f0: number[];
  /** フレームごとの音量 */
  volume: number[];
  /** フレームごとの音素 */
  phonemes: FramePhoneme[];
  /** 全体の音量 */
  volumeScale: number;
  /** 音声データの出力サンプリングレート */
  outputSamplingRate: number;
  /** 音声データをステレオ出力するか */
  outputStereo: boolean;
}

/**
 * ユーザー辞書の単語
 */
export interface UserDictWord {
  /** 表記 */
  surface: string;
  /** 読み（カタカナ） */
  pronunciation: string;
  /** アクセント型（整数） */
  accentType: number;
  /** 単語の種類 */
  wordType: number;
  /** 優先度（0-10） */
  priority: number;
}
