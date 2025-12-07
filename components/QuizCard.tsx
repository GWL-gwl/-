import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Button } from './Button';
import { Icons } from './Icon';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  isLast: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  short_answer: '简答',
};

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext,
  isLast
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // 切换题目时重置状态
    setSelectedOption(null);
    setShowExplanation(false);
    setIsCorrect(null);
  }, [question.id]);

  const handleOptionClick = (option: string) => {
    if (selectedOption) return; // 已选则不可更改

    setSelectedOption(option);
    
    // 简单的文本匹配判断
    const correct = option.trim() === question.correctAnswer.trim();
    setIsCorrect(correct);
    onAnswer(option);
    
    // 选中后延迟显示解析
    setTimeout(() => {
      setShowExplanation(true);
    }, 400);
  };

  const getOptionStyle = (option: string) => {
    const base = "border-2 transition-all duration-200";
    
    if (!selectedOption) {
      return `${base} bg-white border-transparent shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:border-green-100 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]`;
    }
    
    const isThisCorrect = option === question.correctAnswer;
    const isThisSelected = option === selectedOption;

    // 正确答案高亮（无论用户选没选）
    if (isThisCorrect) {
      return `${base} bg-green-50 border-[#07C160] text-[#07C160] font-bold shadow-none`;
    }
    
    // 错误选项高亮
    if (isThisSelected && !isThisCorrect) {
      return `${base} bg-red-50 border-red-500 text-red-600 font-bold shadow-none`;
    }
    
    // 其他无关选项
    return `${base} bg-gray-50 border-transparent opacity-50 grayscale shadow-none`;
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* 题目区域 */}
      <div className="mb-8">
        <div className="inline-flex items-center px-2.5 py-1 mb-4 text-xs font-bold bg-[#07C160]/10 text-[#07C160] rounded-lg border border-[#07C160]/20 tracking-wider">
          {TYPE_LABELS[question.type] || '题目'}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed tracking-tight">
          {question.text}
        </h2>
      </div>

      {/* 选项区域 */}
      <div className="flex-1 space-y-4 pb-32">
        {question.options && question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleOptionClick(option)}
            disabled={!!selectedOption}
            className={`w-full p-4 md:p-5 text-left rounded-2xl flex items-start gap-4 relative ${getOptionStyle(option)}`}
          >
            <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-extrabold transition-colors
              ${selectedOption === option || option === question.correctAnswer 
                ? 'border-current' 
                : 'border-gray-200 text-gray-400'}`}
            >
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="text-base leading-relaxed">{option}</span>
            
            {/* 状态图标 */}
            {selectedOption && option === question.correctAnswer && (
              <Icons.CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#07C160]" />
            )}
            {selectedOption === option && option !== question.correctAnswer && (
              <Icons.XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* 底部固定解析与按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-10 max-w-lg mx-auto safe-area-bottom">
        {showExplanation && (
          <div className="mb-4 animate-scale-in origin-bottom">
            <div className={`p-5 rounded-2xl text-sm ${isCorrect ? 'bg-green-50/80 text-green-900 border border-green-100' : 'bg-red-50/80 text-red-900 border border-red-100'}`}>
              <div className="font-bold flex items-center gap-2 mb-2 text-base">
                {isCorrect ? <Icons.Check className="w-4 h-4" /> : <Icons.X className="w-4 h-4" />}
                {isCorrect ? '回答正确' : '答案解析'}
              </div>
              <p className="opacity-90 leading-relaxed text-gray-700">
                {question.explanation}
              </p>
            </div>
          </div>
        )}
        
        {selectedOption ? (
          <Button fullWidth onClick={onNext} className="shadow-xl shadow-green-200/50">
            {isLast ? "查看结果" : "下一题"} 
          </Button>
        ) : (
          <div className="h-12 flex items-center justify-center text-gray-300 text-sm italic font-medium">
            请选择一个选项以继续
          </div>
        )}
      </div>
    </div>
  );
};