/**
 * FFI呼び出しをWorkerスレッドで実行する非同期ディスパッチャ
 *
 * node:ffiには非同期呼び出し機構がないため、音声合成などの重いネイティブ呼び出しを
 * 専用Workerスレッドで実行してイベントループのブロックを防ぐ。
 *
 * ポインタは同一プロセス内で有効なので、引数のマーシャリング（文字列のBuffer化、
 * 出力用Bufferの確保）はすべてメインスレッドで行い、Workerには関数名と
 * プリミティブ値（number/bigint）だけを渡す。
 */

import { Worker } from "node:worker_threads";

/**
 * Workerに渡す、node:ffiにそのまま渡せる形のシグネチャ
 */
export interface NativeSignature {
  readonly return: string;
  readonly arguments: readonly string[];
}

/**
 * Workerスレッド本体
 *
 * e2eテストやexamplesはsrc/のTypeScriptを直接実行するため、ビルド成果物の
 * パス解決に依存しないよう、別ファイルではなく自己完結したCommonJSコード文字列を
 * `eval: true`で実行する。`--experimental-ffi`はメインスレッドのexecArgv/
 * NODE_OPTIONSからWorkerに継承される。
 */
const WORKER_CODE = `
"use strict";
const { parentPort, workerData } = require("node:worker_threads");
const ffi = process.getBuiltinModule("node:ffi");
if (ffi === undefined) {
  throw new Error("node:ffi is not available in worker thread");
}
const lib = new ffi.DynamicLibrary(workerData.libPath);
const functions = {};
for (const [name, signature] of Object.entries(workerData.signatures)) {
  functions[name] = lib.getFunction(name, signature);
}
parentPort.on("message", (message) => {
  try {
    const fn = functions[message.name];
    if (fn === undefined) {
      throw new Error("FFI function is not available: " + message.name);
    }
    const result = fn(...message.args);
    parentPort.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
`;

type RawResult = number | bigint | boolean | undefined;

interface ResponseMessage {
  id: number;
  ok: boolean;
  result?: RawResult;
  error?: string;
}

interface PendingCall {
  resolve: (value: RawResult) => void;
  reject: (error: Error) => void;
  /** ネイティブ呼び出し完了までポインタ参照先BufferをGCから保護する */
  keepAlive: readonly ArrayBufferView[];
}

/**
 * FFI呼び出しの非同期ディスパッチャ
 *
 * ロードしたライブラリごとに1つ生成する。Workerは初回の非同期呼び出し時に
 * 遅延生成され、待機中の呼び出しがない間はプロセスの終了を妨げない（unref）。
 * Worker 1本のため、非同期呼び出しは直列に実行される。
 */
export class AsyncDispatcher {
  private worker: Worker | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();

  constructor(
    private readonly libPath: string,
    private readonly signatures: Record<string, NativeSignature>,
  ) {}

  /**
   * マーシャリング済みの引数でC関数をWorkerスレッド上で呼び出す
   *
   * @param name - C関数名
   * @param args - マーシャリング済み引数（ポインタはbigint）
   * @param keepAlive - 呼び出し完了まで保持するBuffer群（引数が参照するメモリ）
   */
  call(
    name: string,
    args: readonly (number | bigint)[],
    keepAlive: readonly ArrayBufferView[],
  ): Promise<RawResult> {
    const worker = this.ensureWorker();
    const id = this.nextId++;

    return new Promise<RawResult>((resolve, reject) => {
      if (this.pending.size === 0) {
        // 呼び出し中はイベントループを維持する
        worker.ref();
      }
      this.pending.set(id, { resolve, reject, keepAlive });
      worker.postMessage({ id, name, args });
    });
  }

  private ensureWorker(): Worker {
    if (this.worker !== undefined) {
      return this.worker;
    }

    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { libPath: this.libPath, signatures: this.signatures },
    });

    worker.on("message", (message: ResponseMessage) => {
      const call = this.pending.get(message.id);
      if (call === undefined) {
        return;
      }
      this.pending.delete(message.id);
      if (this.pending.size === 0) {
        worker.unref();
      }
      if (message.ok) {
        call.resolve(message.result);
      } else {
        call.reject(new Error(message.error ?? "Unknown FFI worker error"));
      }
    });

    worker.on("error", (error) => {
      this.handleWorkerFailure(error instanceof Error ? error : new Error(String(error)));
    });

    worker.on("exit", (code) => {
      if (this.worker !== undefined) {
        this.handleWorkerFailure(new Error(`FFI worker exited unexpectedly with code ${code}`));
      }
    });

    worker.unref();
    this.worker = worker;
    return worker;
  }

  private handleWorkerFailure(error: Error): void {
    this.worker = undefined;
    const calls = [...this.pending.values()];
    this.pending.clear();
    for (const call of calls) {
      call.reject(error);
    }
  }
}
