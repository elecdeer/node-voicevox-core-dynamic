/**
 * voicevox_core C API関数シグネチャテーブル
 *
 * node:ffiは構造体をサポートしないため、構造体の値渡し/値返しはABI互換の
 * プリミティブにloweringして宣言している（詳細はnative.tsを参照）:
 *
 * - `VoicevoxLoadOnnxruntimeOptions { const char* filename }`（8B）
 *   → `pointer`1個（値返しは`cstring`）
 * - `VoicevoxInitializeOptions { int32_t; uint16_t }`（8B）
 *   → `u64`1個（packInitializeOptions/unpackInitializeOptionsでパック）
 * - `VoicevoxSynthesisOptions / VoicevoxTtsOptions /
 *   VoicevoxAudioQueryFrameLengthOptions { bool }`（1B）→ `bool_u8`1個
 * - `VoicevoxLoadVoiceModelOptions { int32_t }`（4B）→ `i32`1個
 * - `VoicevoxUserDictWord`（32B）はポインタ渡しのみ（packUserDictWordでパック）
 * - `VoicevoxAudioFeatureSlice`（32B）の値渡し → `audio_feature_slice`
 *   （ABIごとのloweringはfunctions.tsとnative.tsを参照）
 *
 * `voicevox_user_dict_word_make`と`voicevox_audio_feature_slice_new`（32バイト構造体の
 * 値返し）は隠れsretポインタの渡し方がABIによって異なり（AArch64ではx8レジスタ）
 * loweringできないためこのテーブルには含めない。前者はJS側でデフォルト値を再現し
 * （open-jtalk.tsを参照）、後者は`voicevox_audio_feature_slice`で代替する。
 */

import type { FunctionSignature } from "./native.js";

export const FUNCTION_SIGNATURES = {
  // ONNX Runtime関連
  voicevox_get_onnxruntime_lib_min_required_minor_version: { return: "u32", arguments: [] },
  voicevox_get_onnxruntime_lib_max_supported_minor_version: { return: "u32", arguments: [] },
  voicevox_get_onnxruntime_lib_recommended_versioned_filename: {
    return: "cstring",
    arguments: [],
  },
  voicevox_get_onnxruntime_lib_recommended_unversioned_filename: {
    return: "cstring",
    arguments: [],
  },
  // VoicevoxLoadOnnxruntimeOptionsの値返し → 静的文字列へのポインタ
  voicevox_make_default_load_onnxruntime_options: { return: "cstring", arguments: [] },
  voicevox_onnxruntime_get: { return: "pointer", arguments: [] },
  // VoicevoxLoadOnnxruntimeOptionsの値渡し → filenameポインタ1個
  voicevox_onnxruntime_load_once: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_onnxruntime_create_supported_devices_json: {
    return: "i32",
    arguments: ["pointer", "pointer"],
  },

  // Open JTalk関連
  voicevox_open_jtalk_rc_new: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_open_jtalk_rc_use_user_dict: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_open_jtalk_rc_analyze: { return: "i32", arguments: ["pointer", "pointer", "pointer"] },
  voicevox_open_jtalk_rc_delete: { return: "void", arguments: ["pointer"] },

  // 音声モデル関連
  voicevox_voice_model_file_open: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_voice_model_file_id: { return: "void", arguments: ["pointer", "pointer"] },
  voicevox_voice_model_file_create_metas_json: { return: "pointer", arguments: ["pointer"] },
  voicevox_voice_model_file_delete: { return: "void", arguments: ["pointer"] },

  // シンセサイザ関連
  // VoicevoxInitializeOptionsの値返し → u64
  voicevox_make_default_initialize_options: { return: "u64", arguments: [] },
  // VoicevoxInitializeOptionsの値渡し → u64
  voicevox_synthesizer_new: {
    return: "i32",
    arguments: ["pointer", "pointer", "u64", "pointer"],
  },
  voicevox_synthesizer_delete: { return: "void", arguments: ["pointer"] },
  // VoicevoxLoadVoiceModelOptionsの値返し → i32
  voicevox_make_default_load_voice_model_options: { return: "i32", arguments: [] },
  // VoicevoxLoadVoiceModelOptionsの値渡し → i32
  voicevox_synthesizer_load_voice_model: {
    return: "i32",
    arguments: ["pointer", "pointer", "i32"],
  },
  voicevox_synthesizer_unload_voice_model: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_synthesizer_get_onnxruntime: { return: "pointer", arguments: ["pointer"] },
  voicevox_synthesizer_is_gpu_mode: { return: "bool", arguments: ["pointer"] },
  voicevox_synthesizer_is_loaded_voice_model: { return: "bool", arguments: ["pointer", "pointer"] },
  voicevox_synthesizer_create_metas_json: { return: "pointer", arguments: ["pointer"] },

  // AudioQuery/AccentPhrase生成
  voicevox_synthesizer_create_audio_query: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_create_audio_query_from_kana: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_create_accent_phrases: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_create_accent_phrases_from_kana: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_audio_query_create_from_accent_phrases: {
    return: "i32",
    arguments: ["pointer", "pointer"],
  },
  voicevox_synthesizer_replace_mora_data: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_replace_phoneme_length: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_replace_mora_pitch: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },

  // フレーム長
  voicevox_get_frame_rate: { return: "f64", arguments: [] },
  // VoicevoxAudioQueryFrameLengthOptionsの値返し → u8
  voicevox_make_default_audio_query_frame_length_options: { return: "bool_u8", arguments: [] },
  // VoicevoxAudioQueryFrameLengthOptionsの値渡し → u8
  voicevox_audio_query_frame_length: {
    return: "i32",
    arguments: ["pointer", "bool_u8", "pointer"],
  },

  // 音声合成
  // VoicevoxSynthesisOptions / VoicevoxTtsOptionsの値返し → u8
  voicevox_make_default_synthesis_options: { return: "bool_u8", arguments: [] },
  voicevox_make_default_tts_options: { return: "bool_u8", arguments: [] },
  // VoicevoxSynthesisOptions / VoicevoxTtsOptionsの値渡し → u8
  voicevox_synthesizer_synthesis: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "bool_u8", "pointer", "pointer"],
  },
  voicevox_synthesizer_tts: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "bool_u8", "pointer", "pointer"],
  },
  voicevox_synthesizer_tts_from_kana: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "bool_u8", "pointer", "pointer"],
  },
  voicevox_wav_from_s16le: {
    return: "void",
    arguments: ["u64", "pointer", "u32", "bool", "pointer", "pointer"],
  },

  // ストリーミング音声合成（AudioFeature）
  voicevox_synthesizer_create_audio_feature: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "bool_u8", "pointer"],
  },
  voicevox_audio_feature_len: { return: "u64", arguments: ["pointer"] },
  voicevox_audio_feature_is_empty: { return: "bool", arguments: ["pointer"] },
  voicevox_audio_feature_slice: {
    return: "i32",
    arguments: ["pointer", "u64", "u64", "bool", "bool", "bool", "pointer"],
  },
  voicevox_audio_feature_slice_len: {
    return: "i32",
    arguments: ["audio_feature_slice", "pointer"],
  },
  voicevox_audio_feature_slice_is_empty: {
    return: "i32",
    arguments: ["audio_feature_slice", "pointer"],
  },
  voicevox_audio_feature_slice_slice: {
    return: "i32",
    arguments: ["audio_feature_slice", "u64", "u64", "bool", "bool", "bool", "pointer"],
  },
  voicevox_synthesizer_render: {
    return: "i32",
    arguments: ["pointer", "audio_feature_slice", "pointer", "pointer"],
  },
  voicevox_audio_feature_delete: { return: "void", arguments: ["pointer"] },

  // バリデーション
  voicevox_audio_query_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_accent_phrase_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_mora_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_score_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_note_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_frame_audio_query_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_frame_phoneme_validate: { return: "i32", arguments: ["pointer"] },
  voicevox_ensure_compatible: { return: "i32", arguments: ["pointer", "pointer"] },

  // 歌唱音声合成
  voicevox_synthesizer_create_sing_frame_audio_query: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_create_sing_frame_f0: {
    return: "i32",
    arguments: ["pointer", "pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_create_sing_frame_volume: {
    return: "i32",
    arguments: ["pointer", "pointer", "pointer", "u32", "pointer"],
  },
  voicevox_synthesizer_frame_synthesis: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer", "pointer"],
  },

  // ユーザー辞書
  voicevox_user_dict_new: { return: "pointer", arguments: [] },
  voicevox_user_dict_load: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_user_dict_add_word: { return: "i32", arguments: ["pointer", "pointer", "pointer"] },
  voicevox_user_dict_update_word: { return: "i32", arguments: ["pointer", "pointer", "pointer"] },
  voicevox_user_dict_remove_word: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_user_dict_to_json: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_user_dict_import: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_user_dict_save: { return: "i32", arguments: ["pointer", "pointer"] },
  voicevox_user_dict_delete: { return: "void", arguments: ["pointer"] },

  // ユーティリティ
  voicevox_get_version: { return: "cstring", arguments: [] },
  voicevox_error_result_to_message: { return: "cstring", arguments: ["i32"] },
  voicevox_string_free: { return: "void", arguments: ["pointer"] },
  voicevox_bytes_free: { return: "void", arguments: ["pointer"] },
} as const satisfies Record<string, FunctionSignature>;

/**
 * C API関数名
 */
export type FunctionName = keyof typeof FUNCTION_SIGNATURES;
