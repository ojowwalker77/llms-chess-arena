interface AnalysisPanelProps {
  matchId: number;
  existingWhiteCpl: number | null;
  existingBlackCpl: number | null;
}

export function AnalysisPanel({
  existingWhiteCpl,
  existingBlackCpl,
}: AnalysisPanelProps) {
  if (existingWhiteCpl === null || existingBlackCpl === null) {
    return null;
  }

  // Values now store accuracy (0-100) directly
  const whitePrecision = existingWhiteCpl;
  const blackPrecision = existingBlackCpl;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-300 mb-3">
        Stockfish Analysis
      </h3>
      <div className="flex gap-6">
        <div>
          <span className="text-xs text-zinc-500">White Precision</span>
          <p
            className={`text-lg font-mono font-medium ${
              whitePrecision >= 80
                ? "text-green-400"
                : whitePrecision >= 50
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {whitePrecision.toFixed(1)}%
          </p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Black Precision</span>
          <p
            className={`text-lg font-mono font-medium ${
              blackPrecision >= 80
                ? "text-green-400"
                : blackPrecision >= 50
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {blackPrecision.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
