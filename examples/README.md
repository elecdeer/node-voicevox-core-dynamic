# Examples

このディレクトリには、node-voicevox-core-dynamicの使用例が含まれています。

## 前提条件

1. voicevox_coreライブラリをダウンロードして配置
2. 環境変数`VOICEVOX_CORE_LIB_PATH`を設定
3. 音声モデル（VVMファイル）を配置

```bash
# 例: macOSの場合
export VOICEVOX_CORE_LIB_PATH=./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib
```

## サンプル一覧

### 1. basic.ts - 基本的な使い方

最もシンプルな音声合成の例です。

```bash
pnpm tsx examples/basic.ts
```

**学べること:**
- ONNX Runtimeのロード
- OpenJTalkの初期化
- シンセサイザの作成
- 音声モデルのロード
- テキストから音声合成（TTS）
- リソースのクリーンアップ

### 2. audio-query.ts - AudioQueryを使った音声合成

AudioQueryを生成してパラメータを調整する例です。

```bash
pnpm tsx examples/audio-query.ts
```

**学べること:**
- AudioQueryの生成
- 話速・音高・抑揚・音量の調整
- AudioQueryからの音声合成
- パラメータによる音声の変化

### 3. gpu-mode.ts - GPUモードの使用

GPUアクセラレーションを使用する例です。

```bash
pnpm tsx examples/gpu-mode.ts
```

**学べること:**
- GPUモードの有効化
- サポートされているデバイスの確認
- GPUモードの判定
- パフォーマンス測定

### 4. multiple-models.ts - 複数モデルの管理

複数の音声モデルをロード・アンロードする例です。

```bash
pnpm tsx examples/multiple-models.ts
```

**学べること:**
- 複数モデルのロード
- モデルIDの取得
- モデルのメタ情報取得
- モデルのアンロード
- ロード状態の確認

## ディレクトリ構造の例

```
node-voicevox-core-dynamic/
├── voicevox/
│   └── voicevox_core/
│       ├── c_api/
│       │   ├── include/
│       │   │   └── voicevox_core.h
│       │   └── lib/
│       │       └── libvoicevox_core.dylib
│       ├── dict/
│       │   └── (OpenJTalk辞書ファイル)
│       └── models/
│           └── 0.vvm
└── examples/
    └── (このディレクトリ)
```

## トラブルシューティング

### エラー: ライブラリが見つからない

```
Error: dlopen(...): Library not loaded
```

**解決方法:**
- `VOICEVOX_CORE_LIB_PATH`環境変数が正しく設定されているか確認
- ライブラリファイルが実際に存在するか確認
- パスが絶対パスまたは正しい相対パスになっているか確認

### エラー: 辞書が見つからない

```
VoicevoxError [1]: open_jtalk辞書ファイルが読み込まれていない
```

**解決方法:**
- OpenJTalk辞書ディレクトリのパスが正しいか確認
- `./voicevox/voicevox_core/dict`に辞書ファイルが存在するか確認

### エラー: モデルが見つからない

```
Error: ENOENT: no such file or directory
```

**解決方法:**
- VVMファイルのパスが正しいか確認
- `./voicevox/voicevox_core/models/`にVVMファイルが存在するか確認

## その他のリソース

- [VOICEVOX CORE ドキュメント](https://github.com/VOICEVOX/voicevox_core)
- [API リファレンス](../README.md#api-reference)
