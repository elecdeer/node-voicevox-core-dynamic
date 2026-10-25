/**
 * node:ffiモジュールのロードとマーシャリングヘルパー
 *
 * node:ffiはNode.js v26.1.0で追加された実験的モジュールで、
 * `--experimental-ffi`フラグ付きで実行した場合のみ利用できる。
 */

/**
 * 関数シグネチャの型名
 *
 * node:ffiのプリミティブ型に、JS側での変換を表す擬似型を加えたもの:
 * - `cstring`: 戻り値専用。`pointer`として宣言し、NUL終端UTF-8文字列として読み取る
 *   （解放不要な静的文字列にのみ使用する）
 * - `bool_u8`: C ABIで1バイト構造体`{bool}`を値渡し/値返しする箇所を`u8`に
 *   loweringしたもの。JS側ではbooleanとして扱う
 * - `audio_feature_slice`: 引数専用。32バイト構造体`VoicevoxAudioFeatureSlice`の値渡し。
 *   JS側では`AUDIO_FEATURE_SLICE_SIZE`バイトのUint8Arrayとして扱い、
 *   プラットフォームのABIに合わせてloweringする（`getStructPassingAbi`を参照）
 */
export type FfiType =
  | "void"
  | "bool"
  | "u8"
  | "i32"
  | "u32"
  | "u64"
  | "f64"
  | "pointer"
  | "cstring"
  | "bool_u8"
  | "audio_feature_slice";

/**
 * C関数シグネチャ
 */
export interface FunctionSignature {
  readonly return: FfiType;
  readonly arguments: readonly FfiType[];
}

/**
 * node:ffiのDynamicLibraryインスタンス（利用するAPIのみ宣言）
 */
export interface NativeLibrary {
  readonly path: string;
  getFunction(
    name: string,
    signature: { return: string; arguments: readonly string[] },
  ): (...args: unknown[]) => unknown;
  close(): void;
}

/**
 * node:ffiモジュール（利用するAPIのみ宣言）
 */
export interface NodeFfiModule {
  DynamicLibrary: new (path: string) => NativeLibrary;
  getRawPointer(source: ArrayBufferView | ArrayBuffer): bigint;
  toString(pointer: bigint): string | null;
  toBuffer(pointer: bigint, length: number, copy?: boolean): Buffer;
}

let cachedFfi: NodeFfiModule | undefined;

/**
 * node:ffiモジュールを取得する
 *
 * @throws {Error} node:ffiが利用できない場合
 */
export function getNodeFfi(): NodeFfiModule {
  if (cachedFfi === undefined) {
    // node:ffiの型定義は@types/nodeに存在しないため、汎用オーバーロードで取得してキャストする
    const ffi = process.getBuiltinModule("node:ffi") as NodeFfiModule | undefined;
    if (ffi === undefined) {
      throw new Error(
        "node:ffi is not available. " +
          "This package requires Node.js >= 26.1.0 running with the --experimental-ffi flag " +
          '(e.g. `node --experimental-ffi app.js` or `NODE_OPTIONS="--experimental-ffi"`).',
      );
    }
    cachedFfi = ffi;
  }
  return cachedFfi;
}

/**
 * ポインタサイズ（バイト）
 *
 * voicevox_coreは64bitプラットフォームのみ配布しているため8バイト固定とする
 */
export const POINTER_SIZE = 8;

/**
 * NULLポインタ
 */
export const NULL_POINTER = 0n;

/**
 * 文字列をNUL終端UTF-8のBufferに変換する
 */
export function cstr(value: string): Buffer {
  return Buffer.from(`${value}\0`, "utf8");
}

/**
 * 出力ポインタ引数（`_Out_ T** out`や`_Out_ uintptr_t* out`）用のBufferを確保する
 */
export function allocOutPointer(): Buffer {
  return Buffer.alloc(POINTER_SIZE);
}

/**
 * 出力ポインタ引数に書き込まれたポインタ値を読み取る
 */
export function readOutPointer(buf: Buffer): bigint {
  return buf.readBigUInt64LE(0);
}

/**
 * 出力`uintptr_t`引数に書き込まれたサイズ値を読み取る
 */
export function readOutSize(buf: Buffer): number {
  return Number(buf.readBigUInt64LE(0));
}

/**
 * ポインタからNUL終端UTF-8文字列を読み取る
 */
export function readCString(pointer: bigint): string {
  const value = getNodeFfi().toString(pointer);
  if (value === null) {
    throw new Error("Failed to read C string: null pointer");
  }
  return value;
}

/**
 * ポインタからバイト列をコピーして読み取る
 *
 * 戻り値は元のネイティブメモリから独立しており、解放後も安全に利用できる
 */
export function readBytes(pointer: bigint, length: number): Uint8Array {
  const copied = getNodeFfi().toBuffer(pointer, length, true);
  return new Uint8Array(copied.buffer, copied.byteOffset, copied.byteLength);
}

// ========================================
// 構造体のABI lowering
//
// node:ffiは構造体を直接サポートしないため、voicevox_core C APIの小さい構造体
// （16バイト以下のPOD）をABI互換のプリミティブとして受け渡しする。
// x86-64 SysV / Windows x64 / AArch64 AAPCS64（voicevox_coreの全配布対象）では
// これらの構造体はレジスタで受け渡しされ、以下の変換がABI互換になる。
// ========================================

/**
 * `VoicevoxInitializeOptions { int32_t acceleration_mode; uint16_t cpu_num_threads; }`
 * （8バイト構造体の値渡し）をu64にパックする
 */
export function packInitializeOptions(accelerationMode: number, cpuNumThreads: number): bigint {
  return (BigInt(accelerationMode >>> 0) & 0xffffffffn) | (BigInt(cpuNumThreads & 0xffff) << 32n);
}

/**
 * u64として受け取った`VoicevoxInitializeOptions`をフィールドに展開する
 */
export function unpackInitializeOptions(packed: bigint): {
  accelerationMode: number;
  cpuNumThreads: number;
} {
  return {
    accelerationMode: Number(BigInt.asIntN(32, packed & 0xffffffffn)),
    cpuNumThreads: Number((packed >> 32n) & 0xffffn),
  };
}

/**
 * `VoicevoxUserDictWord`構造体（32バイト）をポインタ渡し用にパックする
 *
 * レイアウト: [surface: char*][pronunciation: char*][accent_type: uintptr_t]
 *            [word_type: int32_t][priority: uint8_t][padding: 3B]
 *
 * 戻り値の`keepAlive`は構造体が参照する文字列Buffer。ネイティブ呼び出しが
 * 完了するまで参照を保持してGCを防ぐこと。
 */
export function packUserDictWord(word: {
  surface: string;
  pronunciation: string;
  accentType: number;
  wordType: number;
  priority: number;
}): { struct: Buffer; keepAlive: readonly Buffer[] } {
  const ffi = getNodeFfi();
  const surface = cstr(word.surface);
  const pronunciation = cstr(word.pronunciation);

  const struct = Buffer.alloc(32);
  struct.writeBigUInt64LE(ffi.getRawPointer(surface), 0);
  struct.writeBigUInt64LE(ffi.getRawPointer(pronunciation), 8);
  struct.writeBigUInt64LE(BigInt(word.accentType), 16);
  struct.writeInt32LE(word.wordType, 24);
  struct.writeUInt8(word.priority, 28);

  return { struct, keepAlive: [surface, pronunciation] };
}

// ========================================
// 16バイトを超える構造体の値渡し
//
// `VoicevoxAudioFeatureSlice`（32バイト）の値渡しはABIによって受け渡し方が異なる:
// - AArch64 AAPCS64（Apple含む）/ Windows x64: 呼び出し元が確保したコピーへの
//   ポインタを、通常の引数と同じ位置で渡す
// - x86-64 SysV（Linux/macOS x64）: MEMORYクラスとしてスタックに積む。他の整数引数は
//   構造体を飛ばしてレジスタ（最大6個）に割り当てられる
// ========================================

/**
 * `VoicevoxAudioFeatureSlice`構造体のサイズ（バイト）
 *
 * レイアウト: [audio_feature: ptr][start_offset: uintptr_t][end: uintptr_t]
 *            [end_is_inclusive: bool][clamp: bool][allow_start_exceeds_end: bool][padding: 5B]
 */
export const AUDIO_FEATURE_SLICE_SIZE = 32;

/**
 * x86-64 SysVで整数引数に使われるレジスタ数（rdi, rsi, rdx, rcx, r8, r9）
 */
export const SYSV_X64_INTEGER_REGISTER_COUNT = 6;

/**
 * 16バイトを超える構造体を値渡しするときの受け渡し方
 *
 * - `indirect`: 呼び出し元のコピーへのポインタとして渡す
 * - `sysv-x64`: スタックに積む
 */
export type StructPassingAbi = "indirect" | "sysv-x64";

/**
 * 実行中のプラットフォームでの、16バイトを超える構造体の値渡しの方式を判定する
 *
 * @returns 方式。voicevox_coreの配布対象外のプラットフォームではundefined
 */
export function getStructPassingAbi(
  arch: string = process.arch,
  platform: string = process.platform,
): StructPassingAbi | undefined {
  if (arch === "arm64") {
    return "indirect";
  }
  if (arch === "x64") {
    return platform === "win32" ? "indirect" : "sysv-x64";
  }
  return undefined;
}
