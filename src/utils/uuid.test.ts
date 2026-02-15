import { describe, it, expect } from "vitest";
import { uuidStringToBytes, uuidBytesToString } from "./uuid.js";

describe("UUID変換ユーティリティ", () => {
  describe("uuidStringToBytes", () => {
    it("UUID文字列をUint8Arrayに正しく変換できる", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const bytes = uuidStringToBytes(uuid);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
      expect(Array.from(bytes)).toEqual([
        0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44, 0x00,
        0x00,
      ]);
    });

    it("すべてゼロのUUIDを正しく変換できる", () => {
      const uuid = "00000000-0000-0000-0000-000000000000";
      const bytes = uuidStringToBytes(uuid);

      expect(Array.from(bytes)).toEqual(Array.from({ length: 16 }, () => 0));
    });

    it("すべて0xFFのUUIDを正しく変換できる", () => {
      const uuid = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      const bytes = uuidStringToBytes(uuid);

      expect(Array.from(bytes)).toEqual(Array.from({ length: 16 }, () => 0xff));
    });
  });

  describe("uuidBytesToString", () => {
    it("Uint8ArrayをUUID文字列に正しく変換できる", () => {
      const bytes = new Uint8Array([
        0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44, 0x00,
        0x00,
      ]);
      const uuid = uuidBytesToString(bytes);

      expect(uuid).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("すべてゼロのバイト配列を正しく変換できる", () => {
      const bytes = new Uint8Array(16).fill(0);
      const uuid = uuidBytesToString(bytes);

      expect(uuid).toBe("00000000-0000-0000-0000-000000000000");
    });

    it("すべて0xFFのバイト配列を正しく変換できる", () => {
      const bytes = new Uint8Array(16).fill(0xff);
      const uuid = uuidBytesToString(bytes);

      expect(uuid).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });

    it("1桁の16進数を正しくゼロパディングする", () => {
      const bytes = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x00,
      ]);
      const uuid = uuidBytesToString(bytes);

      expect(uuid).toBe("01020304-0506-0708-090a-0b0c0d0e0f00");
    });
  });

  describe("往復変換", () => {
    it("UUID文字列 → バイト配列 → UUID文字列の往復変換が正しく動作する", () => {
      const original = "550e8400-e29b-41d4-a716-446655440000";
      const bytes = uuidStringToBytes(original);
      const result = uuidBytesToString(bytes);

      expect(result).toBe(original);
    });

    it("バイト配列 → UUID文字列 → バイト配列の往復変換が正しく動作する", () => {
      const original = new Uint8Array([
        0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44, 0x00,
        0x00,
      ]);
      const uuid = uuidBytesToString(original);
      const result = uuidStringToBytes(uuid);

      expect(Array.from(result)).toEqual(Array.from(original));
    });

    it("複数の異なるUUIDで往復変換が正しく動作する", () => {
      const testCases = [
        "00000000-0000-0000-0000-000000000000",
        "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "123e4567-e89b-12d3-a456-426614174000",
        "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      ];

      for (const original of testCases) {
        const bytes = uuidStringToBytes(original);
        const result = uuidBytesToString(bytes);
        expect(result).toBe(original);
      }
    });
  });
});
