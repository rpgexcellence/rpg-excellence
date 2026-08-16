export function calculateClauseScore(
  clauseNumber,
  questions,
  answers
) {
  const clauseQuestionNumbers = (questions ?? [])
    .filter(
      (question) =>
        question.clause === clauseNumber
    )
    .map(
      (question) =>
        question.question_number
    );

  const clauseScores = (answers ?? [])
    .filter((answer) =>
      clauseQuestionNumbers.includes(
        answer.clause
      )
    )
    .map((answer) => answer.score)
    .filter(
      (score) =>
        score !== null &&
        score !== undefined
    );

  if (clauseScores.length === 0) {
    return null;
  }

  return Math.round(
    (clauseScores.reduce(
      (sum, score) =>
        sum + Number(score),
      0
    ) /
      (clauseScores.length * 5)) *
      100
  );
}

export function calculateSimpleOverallScore(
  answers
) {
  const scores = (answers ?? [])
    .map((answer) => answer.score)
    .filter(
      (score) =>
        score !== null &&
        score !== undefined
    );

  if (scores.length === 0) {
    return null;
  }

  return Math.round(
    (scores.reduce(
      (sum, score) =>
        sum + Number(score),
      0
    ) /
      (scores.length * 5)) *
      100
  );
}

export function calculateWeightedOverallScore({
  clauseNumbers,
  questions,
  answers,
  weights,
}) {
  let weightedTotal = 0;
  let usedWeight = 0;

  for (const clauseNumber of clauseNumbers) {
    const clauseScore =
      calculateClauseScore(
        clauseNumber,
        questions,
        answers
      );

    if (clauseScore === null) {
      continue;
    }

    const weight =
      Number(weights?.[clauseNumber]) || 0;

    if (weight <= 0) {
      continue;
    }

    weightedTotal +=
      clauseScore * weight;

    usedWeight += weight;
  }

  if (usedWeight === 0) {
    return null;
  }

  return Math.round(
    weightedTotal / usedWeight
  );
}

export function calculateProgress(
  questions,
  answers
) {
  const totalQuestions =
    questions?.length ?? 0;

  if (totalQuestions === 0) {
    return {
      answered: 0,
      total: 0,
      percentage: 0,
    };
  }

  const validQuestionNumbers =
    new Set(
      questions.map(
        (question) =>
          question.question_number
      )
    );

  const answeredQuestionNumbers =
    new Set(
      (answers ?? [])
        .filter(
          (answer) =>
            validQuestionNumbers.has(
              answer.clause
            ) &&
            answer.score !== null &&
            answer.score !== undefined
        )
        .map(
          (answer) => answer.clause
        )
    );

  const answered =
    answeredQuestionNumbers.size;

  return {
    answered,
    total: totalQuestions,
    percentage: Math.round(
      (answered / totalQuestions) * 100
    ),
  };
}
