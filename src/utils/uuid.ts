/**
 * UUID変換ユーティリティ
 */

/**
 * UUID文字列をUint8Arrayに変換
 *
 * @param uuid - UUID文字列（ハイフン区切り形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
 * @returns 16バイトのUint8Array
 *
 * @example
 * ```typescript
 * const uuid = "550e8400-e29b-41d4-a716-446655440000";
 * const bytes = uuidStringToBytes(uuid);
 * // Uint8Array(16) [ 85, 14, 132, 0, 226, 155, 65, 212, 167, 22, 68, 102, 85, 68, 0, 0 ]
 * ```
 */
export function uuidStringToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Uint8ArrayをUUID文字列に変換
 *
 * @param bytes - 16バイトのUint8Array
 * @returns UUID文字列（ハイフン区切り形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
 *
 * @example
 * ```typescript
 * const bytes = new Uint8Array([85, 14, 132, 0, 226, 155, 65, 212, 167, 22, 68, 102, 85, 68, 0, 0]);
 * const uuid = uuidBytesToString(bytes);
 * // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function uuidBytesToString(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
