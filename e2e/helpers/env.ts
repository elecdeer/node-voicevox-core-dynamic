/**
 * 環境変数からVOICEVOXのパス情報を取得する
 *
 * @throws {Error} 必要な環境変数が設定されていない場合
 */
export function getEnvPaths(): {
  corePath: string;
  onnxruntimePath: string;
  openJtalkDictDir: string;
  modelsPath: string;
  outputDir: string;
} {
  const corePath = process.env.VOICEVOX_CORE_C_API_PATH;
  const onnxruntimePath = process.env.VOICEVOX_ONNXRUNTIME_PATH;
  const openJtalkDictDir = process.env.VOICEVOX_OPEN_JTALK_DICT_DIR;
  const modelsPath = process.env.VOICEVOX_MODELS_PATH;
  const outputDir = process.env.OUTPUT_DIR ?? "./output";

  if (!corePath) {
    throw new Error("VOICEVOX_CORE_C_API_PATH environment variable is not set");
  }
  if (!onnxruntimePath) {
    throw new Error("VOICEVOX_ONNXRUNTIME_PATH environment variable is not set");
  }
  if (!openJtalkDictDir) {
    throw new Error("VOICEVOX_OPEN_JTALK_DICT_DIR environment variable is not set");
  }
  if (!modelsPath) {
    throw new Error("VOICEVOX_MODELS_PATH environment variable is not set");
  }

  return {
    corePath,
    onnxruntimePath,
    openJtalkDictDir,
    modelsPath,
    outputDir,
  };
}
