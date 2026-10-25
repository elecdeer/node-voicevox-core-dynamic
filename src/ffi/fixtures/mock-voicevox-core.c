/*
 * FFI層テスト用のvoicevox_core C APIモック
 *
 * voicevox_core本体と同じシグネチャ（構造体の値渡し/値返しを含む）を持ち、
 * node:ffiによる宣言・マーシャリング・ABI loweringが正しいことを検証する。
 * 入力を戻り値にエコーバックし、mock_last_*アクセサで受け取った値を確認できる。
 *
 * ffi.test.tsがテスト実行時にコンパイルする。
 */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
  const char* filename;
} VoicevoxLoadOnnxruntimeOptions;

typedef struct {
  int32_t acceleration_mode;
  uint16_t cpu_num_threads;
} VoicevoxInitializeOptions;

typedef struct {
  bool enable_interrogative_upspeak;
} VoicevoxSynthesisOptions;

typedef struct {
  bool enable_interrogative_upspeak;
} VoicevoxTtsOptions;

typedef struct {
  bool enable_interrogative_upspeak;
} VoicevoxAudioQueryFrameLengthOptions;

typedef struct {
  int32_t on_existing;
} VoicevoxLoadVoiceModelOptions;

typedef struct {
  const char* surface;
  const char* pronunciation;
  uintptr_t accent_type;
  int32_t word_type;
  uint8_t priority;
} VoicevoxUserDictWord;

/* 実体の代わりに総フレーム数とスタイルIDだけを持つ */
typedef struct {
  uintptr_t len;
  uint32_t style_id;
} VoicevoxAudioFeature;

typedef struct {
  const VoicevoxAudioFeature* audio_feature;
  uintptr_t start_offset;
  uintptr_t end;
  bool end_is_inclusive;
  bool clamp;
  bool allow_start_exceeds_end;
} VoicevoxAudioFeatureSlice;

/* 空のPCMを表すポインタ（解放してはならない） */
static uint8_t empty_bytes_storage[1];
const uint8_t* voicevox_empty_bytes = empty_bytes_storage;

static char* dup_string(const char* s) {
  char* p = malloc(strlen(s) + 1);
  strcpy(p, s);
  return p;
}

static char* dup_echo_json(const char* key, const char* value, uint32_t style_id) {
  char buf[4096];
  snprintf(buf, sizeof(buf), "{\"%s\":\"%s\",\"style_id\":%u}", key, value, style_id);
  return dup_string(buf);
}

/* ==== ユーティリティ ==== */

const char* voicevox_get_version(void) { return "0.0.0-mock"; }

const char* voicevox_error_result_to_message(int32_t result_code) {
  return result_code == 0 ? "OK" : "mock error";
}

void voicevox_string_free(char* string) { free(string); }

static int empty_bytes_free_count = 0;

void voicevox_bytes_free(uint8_t* bytes) {
  if (bytes == voicevox_empty_bytes) {
    empty_bytes_free_count++;
    return;
  }
  free(bytes);
}

/* ==== ONNX Runtime ==== */

static int mock_onnxruntime_instance;
static bool onnxruntime_loaded = false;

uint32_t voicevox_get_onnxruntime_lib_min_required_minor_version(void) { return 17; }

uint32_t voicevox_get_onnxruntime_lib_max_supported_minor_version(void) { return 23; }

const char* voicevox_get_onnxruntime_lib_recommended_versioned_filename(void) {
  return "libmock_onnxruntime.so.1.0.0";
}

const char* voicevox_get_onnxruntime_lib_recommended_unversioned_filename(void) {
  return "libmock_onnxruntime.so";
}

VoicevoxLoadOnnxruntimeOptions voicevox_make_default_load_onnxruntime_options(void) {
  VoicevoxLoadOnnxruntimeOptions options = { "libmock_onnxruntime.so" };
  return options;
}

const void* voicevox_onnxruntime_get(void) {
  return onnxruntime_loaded ? (const void*)&mock_onnxruntime_instance : NULL;
}

static char last_onnxruntime_filename[256];

int32_t voicevox_onnxruntime_load_once(VoicevoxLoadOnnxruntimeOptions options,
                                       const void** out_onnxruntime) {
  if (options.filename == NULL || options.filename[0] == '\0') {
    return 1;
  }
  strncpy(last_onnxruntime_filename, options.filename, sizeof(last_onnxruntime_filename) - 1);
  onnxruntime_loaded = true;
  *out_onnxruntime = &mock_onnxruntime_instance;
  return 0;
}

int32_t voicevox_onnxruntime_create_supported_devices_json(const void* onnxruntime,
                                                           char** output) {
  (void)onnxruntime;
  *output = dup_string("{\"cpu\":true,\"cuda\":false,\"dml\":false}");
  return 0;
}

/* ==== Open JTalk ==== */

int32_t voicevox_open_jtalk_rc_new(const char* open_jtalk_dic_dir, void** out_open_jtalk) {
  if (open_jtalk_dic_dir == NULL || open_jtalk_dic_dir[0] == '\0') {
    return 1;
  }
  *out_open_jtalk = malloc(1);
  return 0;
}

int32_t voicevox_open_jtalk_rc_use_user_dict(const void* open_jtalk, const void* user_dict) {
  (void)open_jtalk;
  (void)user_dict;
  return 0;
}

int32_t voicevox_open_jtalk_rc_analyze(const void* open_jtalk, const char* text, char** output) {
  (void)open_jtalk;
  *output = dup_echo_json("text", text, 0);
  return 0;
}

void voicevox_open_jtalk_rc_delete(void* open_jtalk) { free(open_jtalk); }

/* ==== 音声モデル ==== */

int32_t voicevox_voice_model_file_open(const char* path, void** out_model) {
  if (path == NULL || path[0] == '\0') {
    return 1;
  }
  *out_model = malloc(1);
  return 0;
}

void voicevox_voice_model_file_id(const void* model, uint8_t* output_voice_model_id) {
  (void)model;
  for (int i = 0; i < 16; i++) {
    output_voice_model_id[i] = (uint8_t)i;
  }
}

char* voicevox_voice_model_file_create_metas_json(const void* model) {
  (void)model;
  return dup_string("[]");
}

void voicevox_voice_model_file_delete(void* model) { free(model); }

/* ==== シンセサイザ ==== */

static int32_t last_acceleration_mode = -1;
static uint32_t last_cpu_num_threads = 0;

VoicevoxInitializeOptions voicevox_make_default_initialize_options(void) {
  VoicevoxInitializeOptions options = { 0, 0 };
  return options;
}

int32_t voicevox_synthesizer_new(const void* onnxruntime, const void* open_jtalk,
                                 VoicevoxInitializeOptions options, void** out_synthesizer) {
  if (onnxruntime == NULL || open_jtalk == NULL) {
    return 1;
  }
  last_acceleration_mode = options.acceleration_mode;
  last_cpu_num_threads = options.cpu_num_threads;
  *out_synthesizer = malloc(1);
  return 0;
}

void voicevox_synthesizer_delete(void* synthesizer) { free(synthesizer); }

static int32_t last_on_existing = -1;

VoicevoxLoadVoiceModelOptions voicevox_make_default_load_voice_model_options(void) {
  VoicevoxLoadVoiceModelOptions options = { 0 };
  return options;
}

int32_t voicevox_synthesizer_load_voice_model(const void* synthesizer, const void* model,
                                              VoicevoxLoadVoiceModelOptions options) {
  (void)synthesizer;
  (void)model;
  last_on_existing = options.on_existing;
  return 0;
}

int32_t voicevox_synthesizer_unload_voice_model(const void* synthesizer,
                                                const uint8_t* model_id) {
  (void)synthesizer;
  (void)model_id;
  return 0;
}

const void* voicevox_synthesizer_get_onnxruntime(const void* synthesizer) {
  (void)synthesizer;
  return &mock_onnxruntime_instance;
}

bool voicevox_synthesizer_is_gpu_mode(const void* synthesizer) {
  (void)synthesizer;
  return false;
}

bool voicevox_synthesizer_is_loaded_voice_model(const void* synthesizer,
                                                const uint8_t* model_id) {
  (void)synthesizer;
  /* 先頭バイトが0のUUIDのみ「ロード済み」としてポインタ引数の内容を検証できるようにする */
  return model_id[0] == 0;
}

char* voicevox_synthesizer_create_metas_json(const void* synthesizer) {
  (void)synthesizer;
  return dup_string("[]");
}

/* ==== AudioQuery / AccentPhrase ==== */

int32_t voicevox_synthesizer_create_audio_query(const void* synthesizer, const char* text,
                                                uint32_t style_id, char** output) {
  (void)synthesizer;
  *output = dup_echo_json("text", text, style_id);
  return 0;
}

int32_t voicevox_synthesizer_create_audio_query_from_kana(const void* synthesizer,
                                                          const char* kana, uint32_t style_id,
                                                          char** output) {
  (void)synthesizer;
  *output = dup_echo_json("kana", kana, style_id);
  return 0;
}

int32_t voicevox_synthesizer_create_accent_phrases(const void* synthesizer, const char* text,
                                                   uint32_t style_id, char** output) {
  (void)synthesizer;
  *output = dup_echo_json("text", text, style_id);
  return 0;
}

int32_t voicevox_synthesizer_create_accent_phrases_from_kana(const void* synthesizer,
                                                             const char* kana,
                                                             uint32_t style_id, char** output) {
  (void)synthesizer;
  *output = dup_echo_json("kana", kana, style_id);
  return 0;
}

int32_t voicevox_audio_query_create_from_accent_phrases(const char* accent_phrases_json,
                                                        char** output) {
  *output = dup_string(accent_phrases_json);
  return 0;
}

int32_t voicevox_synthesizer_replace_mora_data(const void* synthesizer,
                                               const char* accent_phrases_json,
                                               uint32_t style_id, char** output) {
  (void)synthesizer;
  (void)style_id;
  *output = dup_string(accent_phrases_json);
  return 0;
}

int32_t voicevox_synthesizer_replace_phoneme_length(const void* synthesizer,
                                                    const char* accent_phrases_json,
                                                    uint32_t style_id, char** output) {
  (void)synthesizer;
  (void)style_id;
  *output = dup_string(accent_phrases_json);
  return 0;
}

int32_t voicevox_synthesizer_replace_mora_pitch(const void* synthesizer,
                                                const char* accent_phrases_json,
                                                uint32_t style_id, char** output) {
  (void)synthesizer;
  (void)style_id;
  *output = dup_string(accent_phrases_json);
  return 0;
}

/* ==== フレーム長 ==== */

double voicevox_get_frame_rate(void) { return 93.75; }

VoicevoxAudioQueryFrameLengthOptions voicevox_make_default_audio_query_frame_length_options(void) {
  VoicevoxAudioQueryFrameLengthOptions options = { true };
  return options;
}

/* JSONの長さを総フレーム数とし、upspeak有効時は1フレーム加える */
static uintptr_t mock_frame_length(const char* audio_query_json, bool upspeak) {
  return strlen(audio_query_json) + (upspeak ? 1 : 0);
}

int32_t voicevox_audio_query_frame_length(const char* audio_query_json,
                                          VoicevoxAudioQueryFrameLengthOptions options,
                                          uintptr_t* output_frame_length) {
  *output_frame_length = mock_frame_length(audio_query_json, options.enable_interrogative_upspeak);
  return 0;
}

/* ==== 音声合成 ==== */

VoicevoxSynthesisOptions voicevox_make_default_synthesis_options(void) {
  VoicevoxSynthesisOptions options = { true };
  return options;
}

VoicevoxTtsOptions voicevox_make_default_tts_options(void) {
  VoicevoxTtsOptions options = { true };
  return options;
}

/*
 * WAVの代わりに [upspeakフラグ, style_id下位バイト, 入力文字列...] を返し、
 * bool_u8引数と出力バッファのマーシャリングを検証できるようにする
 */
static int32_t mock_synthesize(const char* input, uint32_t style_id, bool upspeak,
                               uintptr_t* output_length, uint8_t** output) {
  size_t len = strlen(input);
  uint8_t* wav = malloc(len + 2);
  wav[0] = upspeak ? 1 : 0;
  wav[1] = (uint8_t)style_id;
  memcpy(wav + 2, input, len);
  *output_length = len + 2;
  *output = wav;
  return 0;
}

int32_t voicevox_synthesizer_synthesis(const void* synthesizer, const char* audio_query_json,
                                       uint32_t style_id, VoicevoxSynthesisOptions options,
                                       uintptr_t* output_length, uint8_t** output) {
  (void)synthesizer;
  return mock_synthesize(audio_query_json, style_id, options.enable_interrogative_upspeak,
                         output_length, output);
}

int32_t voicevox_synthesizer_tts(const void* synthesizer, const char* text, uint32_t style_id,
                                 VoicevoxTtsOptions options, uintptr_t* output_length,
                                 uint8_t** output) {
  (void)synthesizer;
  return mock_synthesize(text, style_id, options.enable_interrogative_upspeak, output_length,
                         output);
}

int32_t voicevox_synthesizer_tts_from_kana(const void* synthesizer, const char* kana,
                                           uint32_t style_id, VoicevoxTtsOptions options,
                                           uintptr_t* output_length, uint8_t** output) {
  (void)synthesizer;
  return mock_synthesize(kana, style_id, options.enable_interrogative_upspeak, output_length,
                         output);
}

/* [is_stereo, sampling_rate下位バイト, pcm...] を返す */
void voicevox_wav_from_s16le(uintptr_t pcm_length, const uint8_t* pcm, uint32_t sampling_rate,
                             bool is_stereo, uintptr_t* output_wav_length, uint8_t** output_wav) {
  uint8_t* wav = malloc(pcm_length + 2);
  wav[0] = is_stereo ? 1 : 0;
  wav[1] = (uint8_t)sampling_rate;
  memcpy(wav + 2, pcm, pcm_length);
  *output_wav_length = pcm_length + 2;
  *output_wav = wav;
}

/* ==== ストリーミング音声合成 ==== */

int32_t voicevox_synthesizer_create_audio_feature(const void* synthesizer,
                                                  const char* audio_query_json,
                                                  uint32_t style_id,
                                                  VoicevoxSynthesisOptions options,
                                                  VoicevoxAudioFeature** out_audio_feature) {
  (void)synthesizer;
  VoicevoxAudioFeature* audio_feature = malloc(sizeof(VoicevoxAudioFeature));
  audio_feature->len = mock_frame_length(audio_query_json, options.enable_interrogative_upspeak);
  audio_feature->style_id = style_id;
  *out_audio_feature = audio_feature;
  return 0;
}

uintptr_t voicevox_audio_feature_len(const VoicevoxAudioFeature* audio_feature) {
  return audio_feature->len;
}

bool voicevox_audio_feature_is_empty(const VoicevoxAudioFeature* audio_feature) {
  return audio_feature->len == 0;
}

/* clampとallow_start_exceeds_endは未対応（falseとして扱う） */
static int32_t resolve_range(uintptr_t len, uintptr_t start, uintptr_t end, bool end_is_inclusive,
                             uintptr_t* out_start, uintptr_t* out_end) {
  uintptr_t end_exclusive = end_is_inclusive ? end + 1 : end;
  if (start > len) {
    return 36;
  }
  if (end_exclusive > len) {
    return 37;
  }
  if (start > end_exclusive) {
    return 38;
  }
  *out_start = start;
  *out_end = end_exclusive;
  return 0;
}

static VoicevoxAudioFeatureSlice make_slice(const VoicevoxAudioFeature* audio_feature,
                                            uintptr_t start, uintptr_t end, bool clamp,
                                            bool allow_start_exceeds_end) {
  VoicevoxAudioFeatureSlice slice = { audio_feature, start, end, false, clamp,
                                      allow_start_exceeds_end };
  return slice;
}

static uintptr_t slice_end_exclusive(VoicevoxAudioFeatureSlice slice) {
  return slice.end_is_inclusive ? slice.end + 1 : slice.end;
}

int32_t voicevox_audio_feature_slice(const VoicevoxAudioFeature* audio_feature,
                                     uintptr_t start_inclusive, uintptr_t end,
                                     bool end_is_inclusive, bool clamp,
                                     bool allow_start_exceeds_end,
                                     VoicevoxAudioFeatureSlice* output) {
  uintptr_t s, e;
  int32_t result = resolve_range(audio_feature->len, start_inclusive, end, end_is_inclusive, &s, &e);
  if (result != 0) {
    return result;
  }
  *output = make_slice(audio_feature, s, e, clamp, allow_start_exceeds_end);
  return 0;
}

int32_t voicevox_audio_feature_slice_len(VoicevoxAudioFeatureSlice audio_feature_slice,
                                         uintptr_t* output) {
  *output = slice_end_exclusive(audio_feature_slice) - audio_feature_slice.start_offset;
  return 0;
}

int32_t voicevox_audio_feature_slice_is_empty(VoicevoxAudioFeatureSlice audio_feature_slice,
                                              bool* output) {
  *output = slice_end_exclusive(audio_feature_slice) == audio_feature_slice.start_offset;
  return 0;
}

int32_t voicevox_audio_feature_slice_slice(VoicevoxAudioFeatureSlice audio_feature_slice,
                                           uintptr_t start_inclusive, uintptr_t end,
                                           bool end_is_inclusive, bool clamp,
                                           bool allow_start_exceeds_end,
                                           VoicevoxAudioFeatureSlice* output) {
  uintptr_t offset = audio_feature_slice.start_offset;
  uintptr_t len = slice_end_exclusive(audio_feature_slice) - offset;
  uintptr_t s, e;
  int32_t result = resolve_range(len, start_inclusive, end, end_is_inclusive, &s, &e);
  if (result != 0) {
    return result;
  }
  *output = make_slice(audio_feature_slice.audio_feature, offset + s, offset + e, clamp,
                       allow_start_exceeds_end);
  return 0;
}

/* このスタイルIDでは先頭以外の区間のrenderを失敗させる */
#define MOCK_RENDER_FAILING_STYLE_ID 254

static int render_count = 0;
static int render_after_delete_count = 0;
static const VoicevoxAudioFeature* last_deleted_audio_feature = NULL;

/* PCMの代わりにフレームごとに [フレーム番号下位バイト, style_id下位バイト] を返す */
int32_t voicevox_synthesizer_render(const void* synthesizer,
                                    VoicevoxAudioFeatureSlice audio_feature_slice,
                                    uintptr_t* output_pcm_length, uint8_t** output_pcm) {
  (void)synthesizer;
  render_count++;
  if (audio_feature_slice.audio_feature == last_deleted_audio_feature) {
    render_after_delete_count++;
    return 8;
  }
  uintptr_t start = audio_feature_slice.start_offset;
  if (audio_feature_slice.audio_feature->style_id == MOCK_RENDER_FAILING_STYLE_ID && start > 0) {
    return 8;
  }
  uintptr_t end = slice_end_exclusive(audio_feature_slice);
  if (end == start) {
    *output_pcm_length = 0;
    *output_pcm = (uint8_t*)voicevox_empty_bytes;
    return 0;
  }
  uint8_t* pcm = malloc((end - start) * 2);
  for (uintptr_t i = start; i < end; i++) {
    pcm[(i - start) * 2] = (uint8_t)i;
    pcm[(i - start) * 2 + 1] = (uint8_t)audio_feature_slice.audio_feature->style_id;
  }
  *output_pcm_length = (end - start) * 2;
  *output_pcm = pcm;
  return 0;
}

static int audio_feature_delete_count = 0;

void voicevox_audio_feature_delete(VoicevoxAudioFeature* audio_feature) {
  if (audio_feature != NULL) {
    audio_feature_delete_count++;
    last_deleted_audio_feature = audio_feature;
  }
  free(audio_feature);
}

/* ==== バリデーション（入力が"{}"以外ならエラー） ==== */

static int32_t mock_validate(const char* json, int32_t error_code) {
  return strcmp(json, "{}") == 0 ? 0 : error_code;
}

int32_t voicevox_audio_query_validate(const char* json) { return mock_validate(json, 14); }
int32_t voicevox_accent_phrase_validate(const char* json) { return mock_validate(json, 15); }
int32_t voicevox_mora_validate(const char* json) { return mock_validate(json, 30); }
int32_t voicevox_score_validate(const char* json) { return mock_validate(json, 31); }
int32_t voicevox_note_validate(const char* json) { return mock_validate(json, 32); }
int32_t voicevox_frame_audio_query_validate(const char* json) { return mock_validate(json, 33); }
int32_t voicevox_frame_phoneme_validate(const char* json) { return mock_validate(json, 34); }

int32_t voicevox_ensure_compatible(const char* score_json, const char* frame_audio_query_json) {
  (void)score_json;
  (void)frame_audio_query_json;
  return 0;
}

/* ==== 歌唱音声合成 ==== */

int32_t voicevox_synthesizer_create_sing_frame_audio_query(const void* synthesizer,
                                                           const char* score_json,
                                                           uint32_t style_id, char** output) {
  (void)synthesizer;
  *output = dup_echo_json("score", score_json, style_id);
  return 0;
}

int32_t voicevox_synthesizer_create_sing_frame_f0(const void* synthesizer, const char* score_json,
                                                  const char* frame_audio_query_json,
                                                  uint32_t style_id, char** output) {
  (void)synthesizer;
  (void)score_json;
  (void)frame_audio_query_json;
  (void)style_id;
  *output = dup_string("[]");
  return 0;
}

int32_t voicevox_synthesizer_create_sing_frame_volume(const void* synthesizer,
                                                      const char* score_json,
                                                      const char* frame_audio_query_json,
                                                      uint32_t style_id, char** output) {
  (void)synthesizer;
  (void)score_json;
  (void)frame_audio_query_json;
  (void)style_id;
  *output = dup_string("[]");
  return 0;
}

int32_t voicevox_synthesizer_frame_synthesis(const void* synthesizer,
                                             const char* frame_audio_query_json,
                                             uint32_t style_id, uintptr_t* output_wav_length,
                                             uint8_t** output_wav) {
  (void)synthesizer;
  return mock_synthesize(frame_audio_query_json, style_id, false, output_wav_length, output_wav);
}

/* ==== ユーザー辞書 ==== */

static char last_word_surface[256];
static char last_word_pronunciation[256];
static uint64_t last_word_accent_type = 0;
static int32_t last_word_type = -1;
static uint32_t last_word_priority = 0;

static void record_word(const VoicevoxUserDictWord* word) {
  strncpy(last_word_surface, word->surface, sizeof(last_word_surface) - 1);
  strncpy(last_word_pronunciation, word->pronunciation, sizeof(last_word_pronunciation) - 1);
  last_word_accent_type = word->accent_type;
  last_word_type = word->word_type;
  last_word_priority = word->priority;
}

void* voicevox_user_dict_new(void) { return malloc(1); }

int32_t voicevox_user_dict_load(const void* user_dict, const char* dict_path) {
  (void)user_dict;
  (void)dict_path;
  return 0;
}

int32_t voicevox_user_dict_add_word(const void* user_dict, const VoicevoxUserDictWord* word,
                                    uint8_t* output_word_uuid) {
  (void)user_dict;
  record_word(word);
  for (int i = 0; i < 16; i++) {
    output_word_uuid[i] = (uint8_t)(0xa0 + i);
  }
  return 0;
}

int32_t voicevox_user_dict_update_word(const void* user_dict, const uint8_t* word_uuid,
                                       const VoicevoxUserDictWord* word) {
  (void)user_dict;
  (void)word_uuid;
  record_word(word);
  return 0;
}

int32_t voicevox_user_dict_remove_word(const void* user_dict, const uint8_t* word_uuid) {
  (void)user_dict;
  (void)word_uuid;
  return 0;
}

int32_t voicevox_user_dict_to_json(const void* user_dict, char** output) {
  (void)user_dict;
  *output = dup_string("{}");
  return 0;
}

int32_t voicevox_user_dict_import(const void* user_dict, const void* other_dict) {
  (void)user_dict;
  (void)other_dict;
  return 0;
}

int32_t voicevox_user_dict_save(const void* user_dict, const char* path) {
  (void)user_dict;
  (void)path;
  return 0;
}

void voicevox_user_dict_delete(void* user_dict) { free(user_dict); }

/* ==== 検証用アクセサ（voicevox_core本体には存在しない） ==== */

const char* mock_last_onnxruntime_filename(void) { return last_onnxruntime_filename; }
int32_t mock_last_acceleration_mode(void) { return last_acceleration_mode; }
uint32_t mock_last_cpu_num_threads(void) { return last_cpu_num_threads; }
const char* mock_last_word_surface(void) { return last_word_surface; }
const char* mock_last_word_pronunciation(void) { return last_word_pronunciation; }
uint64_t mock_last_word_accent_type(void) { return last_word_accent_type; }
int32_t mock_last_word_type(void) { return last_word_type; }
uint32_t mock_last_word_priority(void) { return last_word_priority; }
int32_t mock_last_on_existing(void) { return last_on_existing; }
int32_t mock_empty_bytes_free_count(void) { return empty_bytes_free_count; }
int32_t mock_audio_feature_delete_count(void) { return audio_feature_delete_count; }
int32_t mock_render_count(void) { return render_count; }
int32_t mock_render_after_delete_count(void) { return render_after_delete_count; }
