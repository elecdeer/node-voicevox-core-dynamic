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
	consonantLength: number | null;
	/** 母音の音素 */
	vowel: string;
	/** 母音の音長 */
	vowelLength: number;
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
	pauseMora: Mora | null;
	/** 疑問文かどうか */
	isInterrogative?: boolean;
}

/**
 * AudioQuery
 *
 * 音声合成用のクエリ
 */
export interface AudioQuery {
	/** アクセント句の配列 */
	accentPhrases: AccentPhrase[];
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
