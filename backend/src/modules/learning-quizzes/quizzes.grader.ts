export function gradeQuizSubmission(
  questions: any[],
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>
) {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionIds]));
  let score = 0;
  let maxScore = 0;

  const review = questions.map((q) => {
    maxScore += q.points;
    const selected = answerMap.get(q.id) || [];
    const correctOptions = q.options.filter((o: any) => o.isCorrect);
    const correctIds = correctOptions.map((o: any) => o.id);

    let isCorrect: boolean;
    if (q.type === 'MULTI') {
      isCorrect =
        correctIds.length > 0 &&
        selected.length === correctIds.length &&
        correctIds.every((id: string) => selected.includes(id));
    } else {
      isCorrect = selected.length === 1 && correctIds.includes(selected[0]);
    }

    if (isCorrect) score += q.points;

    return {
      questionId: q.id,
      selectedOptionIds: selected,
      isCorrect,
      correctOptionIds: correctIds,
      explanation: q.explanation || null,
    };
  });

  return { score, maxScore, review };
}
