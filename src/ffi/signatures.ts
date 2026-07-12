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
 * - `VoicevoxSynthesisOptions / VoicevoxTtsOptions { bool }`（1B）
 *   → `bool_u8`1個
 * - `VoicevoxUserDictWord`（32B）はポインタ渡しのみ（packUserDictWordでパック）
 *
 * `voicevox_user_dict_word_make`（32バイト構造体の値返し）は隠れsretポインタの
 * 渡し方がABIによって異なり（AArch64ではx8レジスタ）loweringできないため
 * このテーブルには含めず、JS側でデフォルト値を再現している（open-jtalk.tsを参照）。
 */

import type { FunctionSignature } from "./native.js";

export const FUNCTION_SIGNATURES = {
  // ONNX Runtime関連
  voicevox_get_onnxruntime_lib_versioned_filename: { return: "cstring", arguments: [] },
  voicevox_get_onnxruntime_lib_unversioned_filename: { return: "cstring", arguments: [] },
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
  voicevox_synthesizer_load_voice_model: { return: "i32", arguments: ["pointer", "pointer"] },
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

  // バリデーション
  // Note: これらの関数は新しいバージョンのvoicevox_coreで追加されたため、
  // 古いバージョンでは利用できません。存在しない場合はundefinedになります。
  voicevox_audio_query_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_accent_phrase_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_mora_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_score_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_note_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_frame_audio_query_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_frame_phoneme_validate: { return: "i32", arguments: ["pointer"], optional: true },
  voicevox_ensure_compatible: { return: "i32", arguments: ["pointer", "pointer"], optional: true },

  // 歌唱音声合成
  // Note: これらの関数はv0.16.4以降で追加されたため、古いバージョンでは利用できません。
  voicevox_synthesizer_create_sing_frame_audio_query: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer"],
    optional: true,
  },
  voicevox_synthesizer_create_sing_frame_f0: {
    return: "i32",
    arguments: ["pointer", "pointer", "pointer", "u32", "pointer"],
    optional: true,
  },
  voicevox_synthesizer_create_sing_frame_volume: {
    return: "i32",
    arguments: ["pointer", "pointer", "pointer", "u32", "pointer"],
    optional: true,
  },
  voicevox_synthesizer_frame_synthesis: {
    return: "i32",
    arguments: ["pointer", "pointer", "u32", "pointer", "pointer"],
    optional: true,
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
  voicevox_json_free: { return: "void", arguments: ["pointer"] },
  voicevox_wav_free: { return: "void", arguments: ["pointer"] },
} as const satisfies Record<string, FunctionSignature>;

/**
 * C API関数名
 */
export type FunctionName = keyof typeof FUNCTION_SIGNATURES;
