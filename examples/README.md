# Examples

このディレクトリには、node-voicevox-core-dynamicの使用例が含まれています。

## 前提条件

1. voicevox_coreライブラリをダウンロードして配置
2. 音声モデル（VVMファイル）を配置

各サンプルコードでは、高レベルAPIを使用しており、ライブラリパスを直接指定します。
環境変数の設定は不要です。

## サンプル一覧

### 1. basic.ts - 基本的な使い方

最もシンプルな音声合成の例です。高レベルAPI（`createVoicevoxClient`）を使用し、
`using`宣言によってリソース管理が自動化されています。

```bash
pnpm tsx examples/basic.ts
```

**学べること:**

- 高レベルAPIによるクライアント作成
- `using`宣言による自動リソース管理
- 音声モデルのオープンとロード
- メタ情報の取得
- テキストから音声合成（TTS）
- 自動クリーンアップ

### 2. audio-query.ts - AudioQueryを使った音声合成

AudioQueryを生成してパラメータを調整する例です。
高レベルAPIで簡潔に記述できます。

```bash
pnpm tsx examples/audio-query.ts
```

**学べること:**

- AudioQueryの生成（`client.createAudioQuery`）
- 話速・音高・抑揚・音量の調整
- AudioQueryからの音声合成（`client.synthesize`）
- パラメータによる音声の変化

### 3. gpu-mode.ts - GPUモードの使用

GPUアクセラレーションを使用する例です。
初期化オプションで簡単にGPUモードを有効化できます。

```bash
pnpm tsx examples/gpu-mode.ts
```

**学べること:**

- 初期化オプションでのGPUモード有効化
- GPUモードの判定（`client.isGpuMode`）
- パフォーマンス測定

### 4. multiple-models.ts - 複数モデルの管理

複数の音声モデルをロードする例です。
`using`宣言により、複数のモデルファイルを安全に管理できます。

```bash
pnpm tsx examples/multiple-models.ts
```

**学べること:**

- 複数モデルのロード（`client.loadModel`）
- モデルIDとメタ情報の取得
- ロード済みスピーカーの確認（`client.getLoadedSpeakers`）
- 複数モデルでの音声合成

## ディレクトリ構造の例

サンプルコードを実行するには、以下のようなディレクトリ構造を準備してください：

```
node-voicevox-core-dynamic/
├── voicevox/
│   └── voicevox_core/
│       ├── c_api/
│       │   └── lib/
│       │       ├── libvoicevox_core.dylib      # macOS
│       │       └── libonnxruntime.1.13.1.dylib # ONNX Runtime
│       ├── dict/
│       │   └── open_jtalk_dic_utf_8-1.11/
│       │       └── (OpenJTalk辞書ファイル群)
│       └── models/
│           └── vvms/
│               ├── 0.vvm  # 音声モデル1
│               └── 1.vvm  # 音声モデル2
└── examples/
    ├── basic.ts
    ├── audio-query.ts
    ├── gpu-mode.ts
    └── multiple-models.ts
```

**必要なファイル:**
- `libvoicevox_core.dylib` (Windows: `voicevox_core.dll`, Linux: `libvoicevox_core.so`)
- `libonnxruntime.1.13.1.dylib` (ONNX Runtime)
- OpenJTalk辞書ファイル群
- VVMファイル（音声モデル）

## 高レベルAPI vs 低レベルAPI

このディレクトリのサンプルは高レベルAPI（`createVoicevoxClient`）を使用しています。
低レベルAPIを直接使用することも可能ですが、以下の利点があるため高レベルAPIの使用を推奨します：

- **シンプル**: 初期化手順が1つの関数呼び出しにまとまっている
- **安全**: `using`宣言による自動リソース管理でメモリリークを防止
- **明示的**: ライブラリパスを直接指定（環境変数不要）
- **型安全**: TypeScriptの型定義が充実

## トラブルシューティング

### エラー: ライブラリが見つからない

```
Error: dlopen(...): Library not loaded
```

**解決方法:**

- `createVoicevoxClient`の`corePath`が正しいか確認
- ライブラリファイルが実際に存在するか確認
- パスが絶対パスまたは正しい相対パスになっているか確認

### エラー: 辞書が見つからない

```
VoicevoxError [1]: open_jtalk辞書ファイルが読み込まれていない
```

**解決方法:**

- `createVoicevoxClient`の`openJtalkDictDir`が正しいか確認
- 指定したディレクトリにOpenJTalk辞書ファイルが存在するか確認

### エラー: モデルが見つからない

```
Error: ENOENT: no such file or directory
```

**解決方法:**

- `client.openModelFile`に渡すVVMファイルのパスが正しいか確認
- 指定したパスにVVMファイルが存在するか確認

## その他のリソース

- [VOICEVOX CORE ドキュメント](https://github.com/VOICEVOX/voicevox_core)
- [API リファレンス](../README.md#api-reference)
