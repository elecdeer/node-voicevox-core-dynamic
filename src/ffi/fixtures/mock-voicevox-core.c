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
  const char* surface;
  const char* pronunciation;
  uintptr_t accent_type;
  int32_t word_type;
  uint32_t priority;
} VoicevoxUserDictWord;

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

void voicevox_json_free(char* json) { free(json); }
void voicevox_wav_free(uint8_t* wav) { free(wav); }

/* ==== ONNX Runtime ==== */

static int mock_onnxruntime_instance;
static bool onnxruntime_loaded = false;

const char* voicevox_get_onnxruntime_lib_versioned_filename(void) {
  return "libmock_onnxruntime.so.1.0.0";
}

const char* voicevox_get_onnxruntime_lib_unversioned_filename(void) {
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

int32_t voicevox_synthesizer_load_voice_model(const void* synthesizer, const void* model) {
  (void)synthesizer;
  (void)model;
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
