/**
 * koffi型定義
 *
 * C APIの型をkoffiで扱えるように定義
 */

import koffi from "koffi";

// ========================================
// 不透明型（Opaque Types）
// ========================================

export const OpenJtalkRcOpaque = koffi.opaque("OpenJtalkRc");
export const VoicevoxOnnxruntimeOpaque = koffi.opaque("VoicevoxOnnxruntime");
export const VoicevoxSynthesizerOpaque = koffi.opaque("VoicevoxSynthesizer");
export const VoicevoxUserDictOpaque = koffi.opaque("VoicevoxUserDict");
export const VoicevoxVoiceModelFileOpaque = koffi.opaque(
	"VoicevoxVoiceModelFile",
);

// ========================================
// ポインタ型（Pointer Types）
// ========================================

export const OpenJtalkRcPtr = koffi.pointer(
	"OpenJtalkRcPtr",
	OpenJtalkRcOpaque,
);
export const VoicevoxOnnxruntimePtr = koffi.pointer(
	"VoicevoxOnnxruntimePtr",
	VoicevoxOnnxruntimeOpaque,
);
export const VoicevoxSynthesizerPtr = koffi.pointer(
	"VoicevoxSynthesizerPtr",
	VoicevoxSynthesizerOpaque,
);
export const VoicevoxUserDictPtr = koffi.pointer(
	"VoicevoxUserDictPtr",
	VoicevoxUserDictOpaque,
);
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
export const VoicevoxLoadOnnxruntimeOptionsStruct = koffi.struct(
	"VoicevoxLoadOnnxruntimeOptions",
	{
		filename: "const char*",
	},
);

/**
 * 初期化オプション構造体
 */
export const VoicevoxInitializeOptionsStruct = koffi.struct(
	"VoicevoxInitializeOptions",
	{
		acceleration_mode: "int32",
		cpu_num_threads: "uint16",
	},
);

/**
 * 音声合成オプション構造体
 */
export const VoicevoxSynthesisOptionsStruct = koffi.struct(
	"VoicevoxSynthesisOptions",
	{
		enable_interrogative_upspeak: "bool",
	},
);

/**
 * TTSオプション構造体
 */
export const VoicevoxTtsOptionsStruct = koffi.struct("VoicevoxTtsOptions", {
	enable_interrogative_upspeak: "bool",
});

/**
 * ユーザー辞書単語構造体
 */
export const VoicevoxUserDictWordStruct = koffi.struct(
	"VoicevoxUserDictWord",
	{
		surface: "const char*",
		pronunciation: "const char*",
		accent_type: "uintptr_t",
		word_type: "int32",
		priority: "uint32",
	},
);

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
