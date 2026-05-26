import { CheckCircle2, Send, Wand2, XCircle } from 'lucide-react';
import type { QuizQuestion, UserAnswer } from '../types';
import ImageAnswerUploader from './ImageAnswerUploader';

interface QuizTakingProps {
  questions: QuizQuestion[];
  answers: UserAnswer[];
  setAnswers: (answers: UserAnswer[]) => void;
  onSubmit: () => void;
}

const typeLabel = {
  single: '单选题',
  judge: '判断题',
  fill: '填空题',
  short: '简答题',
  solution: '解答题',
  material: '材料分析题',
};

export default function QuizTaking({ questions, answers, setAnswers, onSubmit }: QuizTakingProps) {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
  const updateAnswer = (questionId: string, answer: string) => {
    const next = answers.filter((item) => item.questionId !== questionId);
    setAnswers([...next, { questionId, answer }]);
  };
  const answeredCount = questions.filter((question) => answerMap.get(question.id)?.trim()).length;
  const unansweredCount = questions.length - answeredCount;

  const submitWithConfirm = () => {
    if (unansweredCount > 0 && !window.confirm(`还有 ${unansweredCount} 道题未作答，是否继续提交？`)) return;
    onSubmit();
  };

  const fillExcellentPaper = () => {
    setAnswers(questions.map((question) => ({ questionId: question.id, answer: question.answer })));
  };

  const fillWrongPaper = () => {
    const wrongTarget = Math.min(4, Math.max(2, Math.floor(questions.length / 3)));
    setAnswers(
      questions.map((question, index) => {
        if (index < wrongTarget) {
          if (question.type === 'single') {
            return {
              questionId: question.id,
              answer: question.options?.find((option) => option !== question.answer) ?? '故意选错',
            };
          }
          if (question.type === 'judge') {
            return { questionId: question.id, answer: question.answer === '正确' ? '错误' : '正确' };
          }
          return { questionId: question.id, answer: '只记得名称，但没有写出核心含义和考查方式。' };
        }
        return { questionId: question.id, answer: question.answer };
      }),
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">在线考试</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">在线答题</h2>
          <p className="mt-2 text-slate-600">已作答 {answeredCount}/{questions.length} 题，提交后系统将自动评分并识别薄弱知识点。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={submitWithConfirm}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            <Send className="h-5 w-5" />
            提交测评
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-start gap-2 text-sm leading-6 text-slate-600">
            <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span><span className="font-semibold text-slate-800">演示辅助：</span>优秀答卷用于展示高分报告，含错答卷会制造 2-4 个错误，方便展示错因诊断和复习计划。</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={fillExcellentPaper} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              一键优秀答卷
            </button>
            <button onClick={fillWrongPaper} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
              <XCircle className="h-4 w-4" />
              一键含错答卷
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => (
          <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">{typeLabel[question.type]}</span>
            {question.examPattern ? <span className="ml-2 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">{question.examPattern}</span> : null}
            <h3 className="mt-4 font-semibold leading-7 text-slate-950">{index + 1}. {question.question}</h3>
            {question.learningObjective ? <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-800">考查目标：</span>{question.learningObjective}</p> : null}
            {question.type === 'single' && question.options ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    onClick={() => updateAnswer(question.id, option)}
                    className={`focus-ring rounded-xl border px-4 py-3 text-left leading-6 transition ${
                      answerMap.get(question.id) === option
                        ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-white'
                    }`}
                  >
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {question.type === 'judge' ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {['正确', '错误'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer(question.id, option)}
                    className={`focus-ring rounded-xl border px-6 py-3 font-medium transition ${
                      answerMap.get(question.id) === option
                        ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {['fill', 'short', 'solution', 'material'].includes(question.type) ? (
              <>
                <textarea
                  value={answerMap.get(question.id) ?? ''}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                  className="focus-ring mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 leading-7 text-slate-900 shadow-sm placeholder:text-slate-400"
                  placeholder="请输入你的简答/解答步骤，也可以上传手写答案图片识别后再编辑..."
                />
                {(question.answerInputMode === 'both' || question.answerInputMode === 'image' || question.type === 'solution' || question.type === 'material') ? (
                  <ImageAnswerUploader
                    questionId={question.id}
                    questionText={question.question}
                    onRecognized={(text) => updateAnswer(question.id, text)}
                  />
                ) : null}
                {question.scoringRubric?.length ? (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                    <span className="font-semibold">本题得分点：</span>{question.scoringRubric.join('；')}
                  </div>
                ) : null}
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
