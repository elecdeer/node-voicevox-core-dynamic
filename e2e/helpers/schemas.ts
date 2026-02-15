import * as v from "valibot";

/**
 * スタイル情報のスキーマ
 */
export const StyleMetaSchema = v.object({
  id: v.number(),
  name: v.string(),
  type: v.picklist(["talk", "singing_teacher", "frame_decode", "sing"]),
  order: v.number(),
});

/**
 * モデルファイルメタ情報のスキーマ
 */
export const CharacterMetaSchema = v.object({
  name: v.string(),
  styles: v.pipe(v.array(StyleMetaSchema), v.minLength(1)),
  version: v.string(),
  speaker_uuid: v.pipe(v.string(), v.uuid()),
  order: v.number(),
});

export const CharacterMetaWithModelInfoSchema = v.object({
  ...CharacterMetaSchema.entries,
  modelFilePath: v.string(),
  modelId: v.instance(Uint8Array),
});

export const MoraSchema = v.object({
  text: v.string(),
  consonant: v.nullable(v.string()),
  consonant_length: v.nullable(v.number()),
  vowel: v.string(),
  vowel_length: v.number(),
});

export const AccentPhraseSchema = v.object({
  accent: v.number(),
  pause_mora: v.nullable(MoraSchema),
  moras: v.array(MoraSchema),
  is_interrogative: v.boolean(),
});

export const AudioQuerySchema = v.object({
  accent_phrases: v.array(AccentPhraseSchema),
  speedScale: v.number(),
  pitchScale: v.number(),
  intonationScale: v.number(),
  volumeScale: v.number(),
  prePhonemeLength: v.number(),
  postPhonemeLength: v.number(),
});
