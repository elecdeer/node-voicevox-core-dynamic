/**
 * 列挙型定義
 */

/**
 * ハードウェアアクセラレーションモード
 */
export const VoicevoxAccelerationMode = {
  /** 実行環境に合った適切なハードウェアアクセラレーションモードを選択 */
  Auto: 0,
  /** CPUモード */
  Cpu: 1,
  /** GPUモード */
  Gpu: 2,
} as const;

/**
 * ハードウェアアクセラレーションモード型
 */
export type VoicevoxAccelerationMode =
  (typeof VoicevoxAccelerationMode)[keyof typeof VoicevoxAccelerationMode];

/**
 * 処理結果コード
 */
export const VoicevoxResultCode = {
  /** 成功 */
  Ok: 0,
  /** Open JTalk辞書ファイルが読み込まれていない */
  NotLoadedOpenjtalkDictError: 1,
  /** サポートされているデバイス情報取得に失敗した */
  GetSupportedDevicesError: 3,
  /** GPUモードがサポートされていない */
  GpuSupportError: 4,
  /** 推論ライブラリのロードまたは初期化ができなかった */
  InitInferenceRuntimeError: 29,
  /** スタイルIDに対するスタイルが見つからなかった */
  StyleNotFoundError: 6,
  /** 音声モデルIDに対する音声モデルが見つからなかった */
  ModelNotFoundError: 7,
  /** 推論に失敗した、もしくは推論結果が異常 */
  RunModelError: 8,
  /** 入力テキストの解析に失敗した */
  AnalyzeTextError: 11,
  /** 無効なUTF-8文字列が入力された */
  InvalidUtf8InputError: 12,
  /** AquesTalk風記法のテキストの解析に失敗した */
  ParseKanaError: 13,
  /** 無効なAudioQuery */
  InvalidAudioQueryError: 14,
  /** 無効なAccentPhrase */
  InvalidAccentPhraseError: 15,
  /** ZIPファイルを開くことに失敗した */
  OpenZipFileError: 16,
  /** ZIP内のファイルが読めなかった */
  ReadZipEntryError: 17,
  /** モデルの形式が不正 */
  InvalidModelHeaderError: 28,
  /** すでに読み込まれている音声モデルを読み込もうとした */
  ModelAlreadyLoadedError: 18,
  /** すでに読み込まれているスタイルを読み込もうとした */
  StyleAlreadyLoadedError: 26,
  /** 無効なモデルデータ */
  InvalidModelDataError: 27,
  /** ユーザー辞書を読み込めなかった */
  LoadUserDictError: 20,
  /** ユーザー辞書を書き込めなかった */
  SaveUserDictError: 21,
  /** ユーザー辞書に単語が見つからなかった */
  UserDictWordNotFoundError: 22,
  /** OpenJTalkのユーザー辞書の設定に失敗した */
  UseUserDictError: 23,
  /** ユーザー辞書の単語のバリデーションに失敗した */
  InvalidUserDictWordError: 24,
  /** UUIDの変換に失敗した */
  InvalidUuidError: 25,
  /** 無効なMora */
  InvalidMoraError: 30,
  /** 無効なScore */
  InvalidScoreError: 31,
  /** 無効なNote */
  InvalidNoteError: 32,
  /** 無効なFrameAudioQuery */
  InvalidFrameAudioQueryError: 33,
  /** 無効なFramePhoneme */
  InvalidFramePhonemeError: 34,
  /** 互換性のないクエリ */
  IncompatibleQueriesError: 35,
} as const;

/**
 * 処理結果コード型
 */
export type VoicevoxResultCode = (typeof VoicevoxResultCode)[keyof typeof VoicevoxResultCode];

/**
 * ユーザー辞書の単語の種類
 */
export const VoicevoxUserDictWordType = {
  /** 固有名詞 */
  ProperNoun: 0,
  /** 一般名詞 */
  CommonNoun: 1,
  /** 動詞 */
  Verb: 2,
  /** 形容詞 */
  Adjective: 3,
  /** 接尾辞 */
  Suffix: 4,
} as const;

/**
 * ユーザー辞書の単語の種類型
 */
export type VoicevoxUserDictWordType =
  (typeof VoicevoxUserDictWordType)[keyof typeof VoicevoxUserDictWordType];
