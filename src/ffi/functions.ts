/**
 * C API関数宣言
 *
 * voicevox_core C APIの関数をnode:ffiで宣言し、型付きラッパーを生成する
 */

import type {
  OnnxruntimeHandle,
  OpenJtalkHandle,
  SynthesizerHandle,
  VoiceModelFileHandle,
  UserDictHandle,
  OutJsonStringHandle,
  OutWavDataHandle,
  VoicevoxResultCode,
} from "../types/index.js";
import { AsyncDispatcher, type NativeSignature } from "./async-dispatcher.js";
import {
  getNodeFfi,
  readCString,
  NULL_POINTER,
  type FfiType,
  type FunctionSignature,
  type NativeLibrary,
  type NodeFfiModule,
} from "./native.js";
import { FUNCTION_SIGNATURES, type FunctionName } from "./signatures.js";

/**
 * VoicevoxStyleId - スタイルID
 */
export type VoicevoxStyleId = number; // uint32_t

/**
 * 型付きFFI関数
 *
 * そのまま呼ぶと同期実行（呼び出し中はイベントループをブロックする）。
 * `.async`はWorkerスレッドで実行し、イベントループをブロックしない。
 */
export type FfiFunction<TArgs extends readonly unknown[], TReturn> = ((
  ...args: TArgs
) => TReturn) & {
  /** Workerスレッドで実行する非同期呼び出し */
  async: (...args: TArgs) => Promise<TReturn>;
};

/**
 * C API関数群
 *
 * `_Out_`ポインタ引数には`allocOutPointer()`で確保したBufferを渡し、
 * 呼び出し後に`readOutPointer()`で値を読み取る（native.tsを参照）。
 */
export interface VoicevoxCoreFunctions {
  // ライブラリインスタンス
  lib: NativeLibrary;

  // ONNX Runtime関連
  voicevox_get_onnxruntime_lib_versioned_filename: FfiFunction<[], string>;
  voicevox_get_onnxruntime_lib_unversioned_filename: FfiFunction<[], string>;
  /** デフォルトの`VoicevoxLoadOnnxruntimeOptions`のfilename（構造体をloweringして文字列を返す） */
  voicevox_make_default_load_onnxruntime_options: FfiFunction<[], string>;
  voicevox_onnxruntime_get: FfiFunction<[], OnnxruntimeHandle>;
  /** `VoicevoxLoadOnnxruntimeOptions`はfilename文字列としてloweringされている */
  voicevox_onnxruntime_load_once: FfiFunction<
    [filename: string, outOnnxruntime: Buffer],
    VoicevoxResultCode
  >;
  voicevox_onnxruntime_create_supported_devices_json: FfiFunction<
    [onnxruntime: OnnxruntimeHandle, outJson: Buffer],
    VoicevoxResultCode
  >;

  // Open JTalk関連
  voicevox_open_jtalk_rc_new: FfiFunction<
    [dictDir: string, outOpenJtalk: Buffer],
    VoicevoxResultCode
  >;
  voicevox_open_jtalk_rc_use_user_dict: FfiFunction<
    [openJtalk: OpenJtalkHandle, userDict: UserDictHandle],
    VoicevoxResultCode
  >;
  voicevox_open_jtalk_rc_analyze: FfiFunction<
    [openJtalk: OpenJtalkHandle, text: string, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_open_jtalk_rc_delete: FfiFunction<[openJtalk: OpenJtalkHandle], void>;

  // 音声モデル関連
  voicevox_voice_model_file_open: FfiFunction<[path: string, outModel: Buffer], VoicevoxResultCode>;
  voicevox_voice_model_file_id: FfiFunction<[model: VoiceModelFileHandle, outId: Uint8Array], void>;
  voicevox_voice_model_file_create_metas_json: FfiFunction<
    [model: VoiceModelFileHandle],
    OutJsonStringHandle
  >;
  voicevox_voice_model_file_delete: FfiFunction<[model: VoiceModelFileHandle], void>;

  // シンセサイザ関連
  /** デフォルトの`VoicevoxInitializeOptions`（u64にパックされた構造体。unpackInitializeOptionsで展開する） */
  voicevox_make_default_initialize_options: FfiFunction<[], bigint>;
  /** `VoicevoxInitializeOptions`はpackInitializeOptionsでu64にパックして渡す */
  voicevox_synthesizer_new: FfiFunction<
    [
      onnxruntime: OnnxruntimeHandle,
      openJtalk: OpenJtalkHandle,
      packedOptions: bigint,
      outSynthesizer: Buffer,
    ],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_delete: FfiFunction<[synthesizer: SynthesizerHandle], void>;
  voicevox_synthesizer_load_voice_model: FfiFunction<
    [synthesizer: SynthesizerHandle, model: VoiceModelFileHandle],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_unload_voice_model: FfiFunction<
    [synthesizer: SynthesizerHandle, modelId: Uint8Array],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_get_onnxruntime: FfiFunction<
    [synthesizer: SynthesizerHandle],
    OnnxruntimeHandle
  >;
  voicevox_synthesizer_is_gpu_mode: FfiFunction<[synthesizer: SynthesizerHandle], boolean>;
  voicevox_synthesizer_is_loaded_voice_model: FfiFunction<
    [synthesizer: SynthesizerHandle, modelId: Uint8Array],
    boolean
  >;
  voicevox_synthesizer_create_metas_json: FfiFunction<
    [synthesizer: SynthesizerHandle],
    OutJsonStringHandle
  >;

  // AudioQuery/AccentPhrase生成
  voicevox_synthesizer_create_audio_query: FfiFunction<
    [synthesizer: SynthesizerHandle, text: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_create_audio_query_from_kana: FfiFunction<
    [synthesizer: SynthesizerHandle, kana: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_create_accent_phrases: FfiFunction<
    [synthesizer: SynthesizerHandle, text: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_create_accent_phrases_from_kana: FfiFunction<
    [synthesizer: SynthesizerHandle, kana: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_audio_query_create_from_accent_phrases: FfiFunction<
    [accentPhrasesJson: string, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_replace_mora_data: FfiFunction<
    [synthesizer: SynthesizerHandle, accentPhrasesJson: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_replace_phoneme_length: FfiFunction<
    [synthesizer: SynthesizerHandle, accentPhrasesJson: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_replace_mora_pitch: FfiFunction<
    [synthesizer: SynthesizerHandle, accentPhrasesJson: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;

  // 音声合成
  /** デフォルトの`VoicevoxSynthesisOptions.enable_interrogative_upspeak` */
  voicevox_make_default_synthesis_options: FfiFunction<[], boolean>;
  /** デフォルトの`VoicevoxTtsOptions.enable_interrogative_upspeak` */
  voicevox_make_default_tts_options: FfiFunction<[], boolean>;
  /** `VoicevoxSynthesisOptions`はenable_interrogative_upspeakのbooleanとしてloweringされている */
  voicevox_synthesizer_synthesis: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      audioQueryJson: string,
      styleId: number,
      enableInterrogativeUpspeak: boolean,
      outLength: Buffer,
      outWav: Buffer,
    ],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_tts: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      text: string,
      styleId: number,
      enableInterrogativeUpspeak: boolean,
      outLength: Buffer,
      outWav: Buffer,
    ],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_tts_from_kana: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      kana: string,
      styleId: number,
      enableInterrogativeUpspeak: boolean,
      outLength: Buffer,
      outWav: Buffer,
    ],
    VoicevoxResultCode
  >;

  // バリデーション
  // Note: これらの関数は新しいバージョンのvoicevox_coreで追加されたため、
  // 古いバージョンでは利用できません。存在しない場合はundefinedになります。
  voicevox_audio_query_validate?: FfiFunction<[audioQueryJson: string], VoicevoxResultCode>;
  voicevox_accent_phrase_validate?: FfiFunction<[accentPhraseJson: string], VoicevoxResultCode>;
  voicevox_mora_validate?: FfiFunction<[moraJson: string], VoicevoxResultCode>;
  voicevox_score_validate?: FfiFunction<[scoreJson: string], VoicevoxResultCode>;
  voicevox_note_validate?: FfiFunction<[noteJson: string], VoicevoxResultCode>;
  voicevox_frame_audio_query_validate?: FfiFunction<
    [frameAudioQueryJson: string],
    VoicevoxResultCode
  >;
  voicevox_frame_phoneme_validate?: FfiFunction<[framePhonemeJson: string], VoicevoxResultCode>;
  voicevox_ensure_compatible?: FfiFunction<
    [query1Json: string, query2Json: string],
    VoicevoxResultCode
  >;

  // 歌唱音声合成
  // Note: これらの関数はv0.16.4以降で追加されたため、古いバージョンでは利用できません。
  voicevox_synthesizer_create_sing_frame_audio_query?: FfiFunction<
    [synthesizer: SynthesizerHandle, scoreJson: string, styleId: number, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_create_sing_frame_f0?: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      scoreJson: string,
      frameAudioQueryJson: string,
      styleId: number,
      outJson: Buffer,
    ],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_create_sing_frame_volume?: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      scoreJson: string,
      frameAudioQueryJson: string,
      styleId: number,
      outJson: Buffer,
    ],
    VoicevoxResultCode
  >;
  voicevox_synthesizer_frame_synthesis?: FfiFunction<
    [
      synthesizer: SynthesizerHandle,
      frameAudioQueryJson: string,
      styleId: number,
      outLength: Buffer,
      outWav: Buffer,
    ],
    VoicevoxResultCode
  >;

  // ユーザー辞書
  voicevox_user_dict_new: FfiFunction<[], UserDictHandle>;
  voicevox_user_dict_load: FfiFunction<
    [userDict: UserDictHandle, dictPath: string],
    VoicevoxResultCode
  >;
  /** wordはpackUserDictWordでパックした構造体Bufferを渡す */
  voicevox_user_dict_add_word: FfiFunction<
    [userDict: UserDictHandle, word: Buffer, outUuid: Uint8Array],
    VoicevoxResultCode
  >;
  voicevox_user_dict_update_word: FfiFunction<
    [userDict: UserDictHandle, uuid: Uint8Array, word: Buffer],
    VoicevoxResultCode
  >;
  voicevox_user_dict_remove_word: FfiFunction<
    [userDict: UserDictHandle, uuid: Uint8Array],
    VoicevoxResultCode
  >;
  voicevox_user_dict_to_json: FfiFunction<
    [userDict: UserDictHandle, outJson: Buffer],
    VoicevoxResultCode
  >;
  voicevox_user_dict_import: FfiFunction<
    [userDict: UserDictHandle, otherDict: UserDictHandle],
    VoicevoxResultCode
  >;
  voicevox_user_dict_save: FfiFunction<
    [userDict: UserDictHandle, path: string],
    VoicevoxResultCode
  >;
  voicevox_user_dict_delete: FfiFunction<[userDict: UserDictHandle], void>;

  // ユーティリティ
  voicevox_get_version: FfiFunction<[], string>;
  voicevox_error_result_to_message: FfiFunction<[resultCode: VoicevoxResultCode], string>;
  voicevox_json_free: FfiFunction<[json: OutJsonStringHandle], void>;
  voicevox_wav_free: FfiFunction<[wav: OutWavDataHandle], void>;
}

/**
 * 擬似型をnode:ffiが受け付ける型名に変換する
 */
function toNativeType(type: FfiType): string {
  switch (type) {
    case "cstring":
      return "pointer";
    case "bool_u8":
      return "u8";
    default:
      return type;
  }
}

/**
 * シグネチャをnode:ffiにそのまま渡せる形に変換する
 */
function toNativeSignature(signature: FunctionSignature): NativeSignature {
  return {
    return: toNativeType(signature.return),
    arguments: signature.arguments.map(toNativeType),
  };
}

/**
 * JS側の引数を宣言型に基づいてFFIプリミティブに変換する
 *
 * `keepAlive`は引数が参照するメモリのBuffer群。ネイティブ呼び出しが完了するまで
 * 参照を保持してGCを防ぐこと（同期呼び出しはJSスレッドがブロックされるため安全。
 * 非同期呼び出しはAsyncDispatcherが完了まで保持する）。
 */
function marshalArguments(
  name: string,
  types: readonly FfiType[],
  args: readonly unknown[],
  ffi: NodeFfiModule,
): { values: (number | bigint)[]; keepAlive: ArrayBufferView[] } {
  if (args.length !== types.length) {
    throw new TypeError(`${name}: expected ${types.length} arguments, got ${args.length}`);
  }

  const values: (number | bigint)[] = [];
  const keepAlive: ArrayBufferView[] = [];

  for (const [index, type] of types.entries()) {
    const arg = args[index];
    switch (type) {
      case "pointer": {
        if (typeof arg === "string") {
          const buf = Buffer.from(`${arg}\0`, "utf8");
          keepAlive.push(buf);
          values.push(ffi.getRawPointer(buf));
        } else if (ArrayBuffer.isView(arg)) {
          keepAlive.push(arg);
          values.push(ffi.getRawPointer(arg));
        } else if (typeof arg === "bigint") {
          values.push(arg);
        } else if (arg === null || arg === undefined) {
          values.push(NULL_POINTER);
        } else {
          throw new TypeError(`${name}: argument ${index} cannot be passed as a pointer`);
        }
        break;
      }
      case "u64": {
        if (typeof arg === "bigint") {
          values.push(arg);
        } else if (typeof arg === "number") {
          values.push(BigInt(arg));
        } else {
          throw new TypeError(`${name}: argument ${index} must be a bigint or number`);
        }
        break;
      }
      case "i32":
      case "u32":
      case "u8": {
        if (typeof arg !== "number") {
          throw new TypeError(`${name}: argument ${index} must be a number`);
        }
        values.push(arg);
        break;
      }
      case "bool_u8": {
        if (typeof arg !== "boolean") {
          throw new TypeError(`${name}: argument ${index} must be a boolean`);
        }
        values.push(arg ? 1 : 0);
        break;
      }
      default:
        throw new TypeError(`${name}: type "${type}" is not supported as an argument`);
    }
  }

  return { values, keepAlive };
}

/**
 * FFIの生の戻り値を宣言型に基づいてJSの値に変換する
 */
function convertReturnValue(type: FfiType, raw: unknown): unknown {
  switch (type) {
    case "void":
      return undefined;
    case "bool":
    case "bool_u8":
      return Boolean(raw);
    case "cstring":
      return readCString(raw as bigint);
    default:
      return raw;
  }
}

/**
 * 1つのC関数の型付きラッパー（同期 + `.async`）を生成する
 */
function createFunction(
  name: string,
  signature: FunctionSignature,
  lib: NativeLibrary,
  dispatcher: AsyncDispatcher,
  ffi: NodeFfiModule,
): FfiFunction<unknown[], unknown> | undefined {
  let nativeFn: (...args: unknown[]) => unknown;
  try {
    nativeFn = lib.getFunction(name, toNativeSignature(signature));
  } catch (error) {
    if (signature.optional === true) {
      return undefined;
    }
    throw error;
  }

  const syncCall = (...args: unknown[]): unknown => {
    // 同期呼び出し中はJSスレッドがブロックされGCが走らないため、
    // marshalArgumentsのkeepAliveはこのスコープで保持されていれば十分
    const { values } = marshalArguments(name, signature.arguments, args, ffi);
    return convertReturnValue(signature.return, nativeFn(...values));
  };

  const asyncCall = async (...args: unknown[]): Promise<unknown> => {
    const { values, keepAlive } = marshalArguments(name, signature.arguments, args, ffi);
    const raw = await dispatcher.call(name, values, keepAlive);
    return convertReturnValue(signature.return, raw);
  };

  return Object.assign(syncCall, { async: asyncCall });
}

/**
 * C API関数を宣言する
 *
 * @param lib - node:ffiのDynamicLibraryインスタンス
 * @param libPath - ロード済みライブラリのパス（Workerスレッドが再ロードするために使用）
 * @returns C API関数群
 */
export function declareFunctions(lib: NativeLibrary, libPath: string): VoicevoxCoreFunctions {
  const ffi = getNodeFfi();

  const nativeSignatures: Record<string, NativeSignature> = {};
  for (const [name, signature] of Object.entries(FUNCTION_SIGNATURES)) {
    nativeSignatures[name] = toNativeSignature(signature);
  }
  const dispatcher = new AsyncDispatcher(libPath, nativeSignatures);

  const functions: Record<string, unknown> = { lib };
  for (const name of Object.keys(FUNCTION_SIGNATURES) as FunctionName[]) {
    functions[name] = createFunction(name, FUNCTION_SIGNATURES[name], lib, dispatcher, ffi);
  }

  return functions as unknown as VoicevoxCoreFunctions;
}
