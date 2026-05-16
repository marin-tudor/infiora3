// 1. Make a type for your evaluator keys
type EvaluatorKey = "1" | "2" | "3";

// 2. Define Evaluator signature
type Evaluator = (v: string) => boolean;

// 3. Build evaluators map
const evaluators: Record<EvaluatorKey, Evaluator> = {
  "1": (v) => v.trim().length > 0,
  "2": (v) => Number(v) >= 4,
  "3": (v) => v.toLowerCase() === "yes",
};

// 4. Your check function
export const isFeedbackPositive = (
  questions: { text: string; type: string }[],
  answers: Record<string, any>
): number => {
  // typeMap now returns only EvaluatorKey values
  const typeMap = questions.reduce<Record<string, EvaluatorKey>>((m, q) => {
    m[q.text] = q.type as EvaluatorKey;
    return m;
  }, {});

  const entries = Object.entries(answers); // [ [qText, value], … ]
  const total = entries.length;
  let goodCount = 0;

  for (const [qText, rawValue] of entries) {
    const code = typeMap[qText];
    const fn = evaluators[code];
    // ensure value is string
    const value = String(rawValue);
    if (fn(value)) goodCount++;
  }

  const probability = total > 0 ? goodCount / total : 0;

  return probability;
};
