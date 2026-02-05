/**
 * C API関数宣言
 *
 * voicevox_core C APIの関数をkoffiで宣言する
 */

import type { IKoffiLib } from "koffi";
import koffi from "koffi";

// ========================================
// 不透明型（Opaque Types）
// ========================================

export const OpenJtalkRcOpaque = koffi.opaque("OpenJtalkRc");
export const VoicevoxOnnxruntimeOpaque = koffi.opaque("VoicevoxOnnxruntime");
export const VoicevoxSynthesizerOpaque = koffi.opaque("VoicevoxSynthesizer");
export const VoicevoxUserDictOpaque = koffi.opaque("VoicevoxUserDict");
export const VoicevoxVoiceModelFileOpaque = koffi.opaque("VoicevoxVoiceModelFile");

// ========================================
// ポインタ型（Pointer Types）
// ========================================

export const OpenJtalkRcPtr = koffi.pointer("OpenJtalkRcPtr", OpenJtalkRcOpaque);
export const VoicevoxOnnxruntimePtr = koffi.pointer(
  "VoicevoxOnnxruntimePtr",
  VoicevoxOnnxruntimeOpaque,
);
export const VoicevoxSynthesizerPtr = koffi.pointer(
  "VoicevoxSynthesizerPtr",
  VoicevoxSynthesizerOpaque,
);
export const VoicevoxUserDictPtr = koffi.pointer("VoicevoxUserDictPtr", VoicevoxUserDictOpaque);
export const VoicevoxVoiceModelFilePtr = koffi.pointer(
  "VoicevoxVoiceModelFilePtr",
  VoicevoxVoiceModelFileOpaque,
);

// ========================================
// 構造体（Structs）
// ========================================

/**
 * ONNX Runtimeロードオプション構造体
 */
export const VoicevoxLoadOnnxruntimeOptionsStruct = koffi.struct("VoicevoxLoadOnnxruntimeOptions", {
  filename: "const char*",
});

/**
 * 初期化オプション構造体
 */
export const VoicevoxInitializeOptionsStruct = koffi.struct("VoicevoxInitializeOptions", {
  acceleration_mode: "int32",
  cpu_num_threads: "uint16",
});

/**
 * 音声合成オプション構造体
 */
export const VoicevoxSynthesisOptionsStruct = koffi.struct("VoicevoxSynthesisOptions", {
  enable_interrogative_upspeak: "bool",
});

/**
 * TTSオプション構造体
 */
export const VoicevoxTtsOptionsStruct = koffi.struct("VoicevoxTtsOptions", {
  enable_interrogative_upspeak: "bool",
});

/**
 * ユーザー辞書単語構造体
 */
export const VoicevoxUserDictWordStruct = koffi.struct("VoicevoxUserDictWord", {
  surface: "const char*",
  pronunciation: "const char*",
  accent_type: "uintptr_t",
  word_type: "int32",
  priority: "uint32",
});

// ========================================
// 型定義
// ========================================

/**
 * VoicevoxVoiceModelId - UUID (16バイト配列)
 */
export const VoicevoxVoiceModelIdType = koffi.array("uint8", 16);

/**
 * VoicevoxStyleId - スタイルID
 */
export type VoicevoxStyleId = number; // uint32_t

/**
 * VoicevoxResultCode - 結果コード
 */
export type VoicevoxResultCodeRaw = number; // int32_t

/**
 * C API関数群
 */
export interface VoicevoxCoreFunctions {
  // ライブラリインスタンス
  lib: IKoffiLib;
  // ONNX Runtime関連
  voicevox_get_onnxruntime_lib_versioned_filename: (...args: unknown[]) => unknown;
  voicevox_get_onnxruntime_lib_unversioned_filename: (...args: unknown[]) => unknown;
  voicevox_make_default_load_onnxruntime_options: (...args: unknown[]) => unknown;
  voicevox_onnxruntime_get: (...args: unknown[]) => unknown;
  voicevox_onnxruntime_load_once: (...args: unknown[]) => unknown;
  voicevox_onnxruntime_create_supported_devices_json: (...args: unknown[]) => unknown;

  // Open JTalk関連
  voicevox_open_jtalk_rc_new: (...args: unknown[]) => unknown;
  voicevox_open_jtalk_rc_use_user_dict: (...args: unknown[]) => unknown;
  voicevox_open_jtalk_rc_analyze: (...args: unknown[]) => unknown;
  voicevox_open_jtalk_rc_delete: (...args: unknown[]) => unknown;

  // 音声モデル関連
  voicevox_voice_model_file_open: (...args: unknown[]) => unknown;
  voicevox_voice_model_file_id: (...args: unknown[]) => unknown;
  voicevox_voice_model_file_create_metas_json: (...args: unknown[]) => unknown;
  voicevox_voice_model_file_delete: (...args: unknown[]) => unknown;

  // シンセサイザ関連
  voicevox_make_default_initialize_options: (...args: unknown[]) => unknown;
  voicevox_synthesizer_new: (...args: unknown[]) => unknown;
  voicevox_synthesizer_delete: (...args: unknown[]) => unknown;
  voicevox_synthesizer_load_voice_model: (...args: unknown[]) => unknown;
  voicevox_synthesizer_unload_voice_model: (...args: unknown[]) => unknown;
  voicevox_synthesizer_get_onnxruntime: (...args: unknown[]) => unknown;
  voicevox_synthesizer_is_gpu_mode: (...args: unknown[]) => unknown;
  voicevox_synthesizer_is_loaded_voice_model: (...args: unknown[]) => unknown;
  voicevox_synthesizer_create_metas_json: (...args: unknown[]) => unknown;

  // AudioQuery/AccentPhrase生成
  voicevox_synthesizer_create_audio_query: (...args: unknown[]) => unknown;
  voicevox_synthesizer_create_audio_query_from_kana: (...args: unknown[]) => unknown;
  voicevox_synthesizer_create_accent_phrases: (...args: unknown[]) => unknown;
  voicevox_synthesizer_create_accent_phrases_from_kana: (...args: unknown[]) => unknown;
  voicevox_audio_query_create_from_accent_phrases: (...args: unknown[]) => unknown;

  // 音声合成
  voicevox_make_default_synthesis_options: (...args: unknown[]) => unknown;
  voicevox_make_default_tts_options: (...args: unknown[]) => unknown;
  voicevox_synthesizer_synthesis: (...args: unknown[]) => unknown;
  voicevox_synthesizer_tts: (...args: unknown[]) => unknown;
  voicevox_synthesizer_tts_from_kana: (...args: unknown[]) => unknown;

  // バリデーション
  voicevox_audio_query_validate: (...args: unknown[]) => unknown;
  voicevox_accent_phrase_validate: (...args: unknown[]) => unknown;
  voicevox_mora_validate: (...args: unknown[]) => unknown;

  // ユーティリティ
  voicevox_get_version: (...args: unknown[]) => unknown;
  voicevox_error_result_to_message: (...args: unknown[]) => unknown;
  voicevox_json_free: (...args: unknown[]) => unknown;
  voicevox_wav_free: (...args: unknown[]) => unknown;
}

/**
 * C API関数を宣言する
 *
 * @param lib - koffiライブラリインスタンス
 * @returns C API関数群
 */
export function declareFunctions(lib: IKoffiLib): VoicevoxCoreFunctions {
  return {
    // ライブラリインスタンス
    lib,
    // ONNX Runtime関連
    voicevox_get_onnxruntime_lib_versioned_filename: lib.func(
      "const char* voicevox_get_onnxruntime_lib_versioned_filename(void)",
    ),
    voicevox_get_onnxruntime_lib_unversioned_filename: lib.func(
      "const char* voicevox_get_onnxruntime_lib_unversioned_filename(void)",
    ),
    voicevox_make_default_load_onnxruntime_options: lib.func(
      "VoicevoxLoadOnnxruntimeOptions voicevox_make_default_load_onnxruntime_options(void)",
    ),
    voicevox_onnxruntime_get: lib.func(
      "const VoicevoxOnnxruntimePtr voicevox_onnxruntime_get(void)",
    ),
    voicevox_onnxruntime_load_once: lib.func(
      "int32 voicevox_onnxruntime_load_once(VoicevoxLoadOnnxruntimeOptions options, _Out_ const VoicevoxOnnxruntimePtr* out_onnxruntime)",
    ),
    voicevox_onnxruntime_create_supported_devices_json: lib.func(
      "int32 voicevox_onnxruntime_create_supported_devices_json(const VoicevoxOnnxruntimePtr onnxruntime, _Out_ char** output_supported_devices_json)",
    ),

    // Open JTalk関連
    voicevox_open_jtalk_rc_new: lib.func(
      "int32 voicevox_open_jtalk_rc_new(const char* open_jtalk_dic_dir, _Out_ OpenJtalkRcPtr* out_open_jtalk)",
    ),
    voicevox_open_jtalk_rc_use_user_dict: lib.func(
      "int32 voicevox_open_jtalk_rc_use_user_dict(const OpenJtalkRcPtr open_jtalk, const VoicevoxUserDictPtr user_dict)",
    ),
    voicevox_open_jtalk_rc_analyze: lib.func(
      "int32 voicevox_open_jtalk_rc_analyze(const OpenJtalkRcPtr open_jtalk, const char* text, _Out_ char** output_accent_phrases_json)",
    ),
    voicevox_open_jtalk_rc_delete: lib.func(
      "void voicevox_open_jtalk_rc_delete(OpenJtalkRcPtr open_jtalk)",
    ),

    // 音声モデル関連
    voicevox_voice_model_file_open: lib.func(
      "int32 voicevox_voice_model_file_open(const char* path, _Out_ VoicevoxVoiceModelFilePtr* out_model)",
    ),
    voicevox_voice_model_file_id: lib.func(
      "void voicevox_voice_model_file_id(const VoicevoxVoiceModelFilePtr model, _Out_ uint8* output_voice_model_id)",
    ),
    voicevox_voice_model_file_create_metas_json: lib.func(
      "char* voicevox_voice_model_file_create_metas_json(const VoicevoxVoiceModelFilePtr model)",
    ),
    voicevox_voice_model_file_delete: lib.func(
      "void voicevox_voice_model_file_delete(VoicevoxVoiceModelFilePtr model)",
    ),

    // シンセサイザ関連
    voicevox_make_default_initialize_options: lib.func(
      "VoicevoxInitializeOptions voicevox_make_default_initialize_options(void)",
    ),
    voicevox_synthesizer_new: lib.func(
      "int32 voicevox_synthesizer_new(const VoicevoxOnnxruntimePtr onnxruntime, const OpenJtalkRcPtr open_jtalk, VoicevoxInitializeOptions options, _Out_ VoicevoxSynthesizerPtr* out_synthesizer)",
    ),
    voicevox_synthesizer_delete: lib.func(
      "void voicevox_synthesizer_delete(VoicevoxSynthesizerPtr synthesizer)",
    ),
    voicevox_synthesizer_load_voice_model: lib.func(
      "int32 voicevox_synthesizer_load_voice_model(const VoicevoxSynthesizerPtr synthesizer, const VoicevoxVoiceModelFilePtr model)",
    ),
    voicevox_synthesizer_unload_voice_model: lib.func(
      "int32 voicevox_synthesizer_unload_voice_model(const VoicevoxSynthesizerPtr synthesizer, const uint8* model_id)",
    ),
    voicevox_synthesizer_get_onnxruntime: lib.func(
      "const VoicevoxOnnxruntimePtr voicevox_synthesizer_get_onnxruntime(const VoicevoxSynthesizerPtr synthesizer)",
    ),
    voicevox_synthesizer_is_gpu_mode: lib.func(
      "bool voicevox_synthesizer_is_gpu_mode(const VoicevoxSynthesizerPtr synthesizer)",
    ),
    voicevox_synthesizer_is_loaded_voice_model: lib.func(
      "bool voicevox_synthesizer_is_loaded_voice_model(const VoicevoxSynthesizerPtr synthesizer, const uint8* model_id)",
    ),
    voicevox_synthesizer_create_metas_json: lib.func(
      "char* voicevox_synthesizer_create_metas_json(const VoicevoxSynthesizerPtr synthesizer)",
    ),

    // AudioQuery/AccentPhrase生成
    voicevox_synthesizer_create_audio_query: lib.func(
      "int32 voicevox_synthesizer_create_audio_query(const VoicevoxSynthesizerPtr synthesizer, const char* text, uint32 style_id, _Out_ char** output_audio_query_json)",
    ),
    voicevox_synthesizer_create_audio_query_from_kana: lib.func(
      "int32 voicevox_synthesizer_create_audio_query_from_kana(const VoicevoxSynthesizerPtr synthesizer, const char* kana, uint32 style_id, _Out_ char** output_audio_query_json)",
    ),
    voicevox_synthesizer_create_accent_phrases: lib.func(
      "int32 voicevox_synthesizer_create_accent_phrases(const VoicevoxSynthesizerPtr synthesizer, const char* text, uint32 style_id, _Out_ char** output_accent_phrases_json)",
    ),
    voicevox_synthesizer_create_accent_phrases_from_kana: lib.func(
      "int32 voicevox_synthesizer_create_accent_phrases_from_kana(const VoicevoxSynthesizerPtr synthesizer, const char* kana, uint32 style_id, _Out_ char** output_accent_phrases_json)",
    ),
    voicevox_audio_query_create_from_accent_phrases: lib.func(
      "int32 voicevox_audio_query_create_from_accent_phrases(const char* accent_phrases_json, _Out_ char** output_audio_query_json)",
    ),

    // 音声合成
    voicevox_make_default_synthesis_options: lib.func(
      "VoicevoxSynthesisOptions voicevox_make_default_synthesis_options(void)",
    ),
    voicevox_make_default_tts_options: lib.func(
      "VoicevoxTtsOptions voicevox_make_default_tts_options(void)",
    ),
    voicevox_synthesizer_synthesis: lib.func(
      "int32 voicevox_synthesizer_synthesis(const VoicevoxSynthesizerPtr synthesizer, const char* audio_query_json, uint32 style_id, VoicevoxSynthesisOptions options, _Out_ uintptr_t* output_wav_length, _Out_ uint8** output_wav)",
    ),
    voicevox_synthesizer_tts: lib.func(
      "int32 voicevox_synthesizer_tts(const VoicevoxSynthesizerPtr synthesizer, const char* text, uint32 style_id, VoicevoxTtsOptions options, _Out_ uintptr_t* output_wav_length, _Out_ uint8** output_wav)",
    ),
    voicevox_synthesizer_tts_from_kana: lib.func(
      "int32 voicevox_synthesizer_tts_from_kana(const VoicevoxSynthesizerPtr synthesizer, const char* kana, uint32 style_id, VoicevoxTtsOptions options, _Out_ uintptr_t* output_wav_length, _Out_ uint8** output_wav)",
    ),

    // バリデーション
    voicevox_audio_query_validate: lib.func(
      "int32 voicevox_audio_query_validate(const char* audio_query_json)",
    ),
    voicevox_accent_phrase_validate: lib.func(
      "int32 voicevox_accent_phrase_validate(const char* accent_phrase_json)",
    ),
    voicevox_mora_validate: lib.func("int32 voicevox_mora_validate(const char* mora_json)"),

    // ユーティリティ
    voicevox_get_version: lib.func("const char* voicevox_get_version(void)"),
    voicevox_error_result_to_message: lib.func(
      "const char* voicevox_error_result_to_message(int32 result_code)",
    ),
    voicevox_json_free: lib.func("void voicevox_json_free(char* json)"),
    voicevox_wav_free: lib.func("void voicevox_wav_free(uint8* wav)"),
  };
}
