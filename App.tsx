import React, { useState, useRef } from 'react';
import { parseDocumentToQuestions } from './services/geminiService';
import { QuestionBank, AppView, QuizState, ParsingStatus, Question } from './types';
import { MOCK_BANKS, SAMPLE_ICONS } from './constants';
import { Icons } from './components/Icon';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { QuizCard } from './components/QuizCard';

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<AppView>(AppView.Home);
  const [banks, setBanks] = useState<QuestionBank[]>(MOCK_BANKS as any);
  const [activeBankId, setActiveBankId] = useState<string | null>(null);
  const [targetBankId, setTargetBankId] = useState<string | null>(null); // 如果有值，说明是"加题"模式

  // 上传相关 State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ParsingStatus>('extracting');
  const [processingDetail, setProcessingDetail] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const uploadCancelledRef = useRef(false);

  // 答题相关 State
  const [quizState, setQuizState] = useState<QuizState>({
    bankId: '',
    currentQuestionIndex: 0,
    score: 0,
    answers: {},
    isFinished: false
  });

  // --- Handlers ---

  const handleFileUpload = async (file: File) => {
    uploadCancelledRef.current = false;
    setIsProcessing(true);
    setProcessingStatus('extracting');
    setProcessingDetail('正在初始化解析引擎...');
    setErrorMsg(null);

    try {
      const result = await parseDocumentToQuestions(file, (status, detail) => {
        if (!uploadCancelledRef.current) {
          setProcessingStatus(status);
          if (detail) setProcessingDetail(detail);
        }
      });

      if (uploadCancelledRef.current) return;

      if (result.questions.length === 0) {
        throw new Error("未提取到有效题目");
      }

      if (targetBankId) {
        // 加题模式
        setBanks(prev => prev.map(bank => {
          if (bank.id === targetBankId) {
            return {
              ...bank,
              questions: [...bank.questions, ...result.questions]
            };
          }
          return bank;
        }));
        setTargetBankId(null);
      } else {
        // 新建模式
        const newBank: QuestionBank = {
          id: Date.now().toString(),
          title: result.title,
          description: `包含 ${result.questions.length} 道题目`,
          createdAt: Date.now(),
          questions: result.questions,
          icon: SAMPLE_ICONS[Math.floor(Math.random() * SAMPLE_ICONS.length)],
          themeColor: 'green'
        };
        setBanks(prev => [newBank, ...prev]);
      }

      setCurrentView(AppView.Home);
    } catch (err: any) {
      if (uploadCancelledRef.current) return;
      console.error(err);
      setErrorMsg(err.message || "解析失败，请重试");
    } finally {
      if (!uploadCancelledRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const handleCancelUpload = () => {
    uploadCancelledRef.current = true;
    setIsProcessing(false);
    setErrorMsg(null);
  };

  const startQuiz = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank || bank.questions.length === 0) return;

    setActiveBankId(bankId);
    setQuizState({
      bankId,
      currentQuestionIndex: 0,
      score: 0,
      answers: {},
      isFinished: false
    });
    setCurrentView(AppView.Quiz);
  };

  const handleDeleteBank = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这个题库吗？")) {
      setBanks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleAddQuestions = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTargetBankId(id);
    setCurrentView(AppView.Upload);
  };

  // --- Render Views ---

  const renderHome = () => (
    <div className="flex flex-col h-screen bg-[#F7F8FA] bg-noise">
      {/* 沉浸式头部 */}
      <div className="bg-gradient-to-b from-[#07C160] to-[#059669] pt-14 pb-20 px-6 rounded-b-[2.5rem] shadow-xl shadow-green-900/10 relative z-0 overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="text-white">
            <h1 className="text-2xl font-bold tracking-tight mb-1">刷题大师</h1>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-1.5 h-1.5 bg-green-200 rounded-full animate-pulse"></span>
              <p className="text-xs font-medium">今天也要进步一点点</p>
            </div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-lg">
            <Icons.Book className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {/* 数据概览悬浮卡片 */}
        <div className="absolute left-6 right-6 -bottom-10 grid grid-cols-2 gap-4">
           <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
             <div className="text-gray-500 text-xs mb-1 font-medium flex items-center gap-1">
               <Icons.FileText className="w-3 h-3" /> 我的题库
             </div>
             <div className="text-gray-900 text-2xl font-extrabold font-mono">{banks.length}</div>
           </div>
           <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
             <div className="text-gray-500 text-xs mb-1 font-medium flex items-center gap-1">
               <Icons.CheckCircle className="w-3 h-3" /> 累计刷题
             </div>
             <div className="text-gray-900 text-2xl font-extrabold font-mono">0</div>
           </div>
        </div>
      </div>

      {/* 题库列表容器 */}
      <div className="flex-1 mt-14 px-5 overflow-y-auto pb-24 z-10 scrollbar-hide space-y-6">
        
        {/* 新建按钮 */}
        <button 
          onClick={() => { setTargetBankId(null); setCurrentView(AppView.Upload); }}
          className="w-full bg-white p-5 rounded-[1.2rem] shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all border border-green-50/50 hover:shadow-lg hover:shadow-green-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-green-50 to-green-100 rounded-2xl flex items-center justify-center text-[#07C160] group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Icons.Plus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900 text-lg">新建题库</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">支持 PDF, Word, Excel</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#07C160] group-hover:text-white transition-colors">
            <Icons.ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
          </div>
        </button>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 pl-1 tracking-wide uppercase">最近练习</h2>
          
          {banks.length === 0 ? (
             <div className="text-center py-12 flex flex-col items-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                  <Icons.FileText className="w-8 h-8" />
               </div>
               <div className="text-gray-400 text-sm font-medium">暂无题库，快去创建一个吧！</div>
             </div>
          ) : (
             banks.map(bank => (
               <div 
                 key={bank.id}
                 onClick={() => startQuiz(bank.id)}
                 className="bg-white p-5 rounded-[1.2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-50 relative group overflow-hidden active:scale-[0.99] transition-transform"
               >
                 <div className="flex gap-4">
                   <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl border border-gray-100 flex-shrink-0 shadow-sm">
                     {bank.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                       <h3 className="font-bold text-gray-900 truncate text-lg pr-4">{bank.title}</h3>
                     </div>
                     <p className="text-xs text-gray-400 mt-1 truncate">{bank.description}</p>
                     
                     <div className="flex items-center gap-2 mt-3.5">
                        <span className="bg-green-50 text-green-700 text-[10px] px-2.5 py-1 rounded-md font-bold flex items-center gap-1">
                          <Icons.FileText className="w-3 h-3" /> {bank.questions.length} 题
                        </span>
                     </div>
                   </div>
                 </div>

                 {/* 卡片操作栏 */}
                 <div className="mt-5 pt-3 border-t border-gray-50 flex justify-end gap-2">
                    <button 
                      onClick={(e) => handleAddQuestions(e, bank.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                    >
                      <Icons.FilePlus className="w-3.5 h-3.5" /> 加题
                    </button>
                    <button 
                      onClick={(e) => handleDeleteBank(e, bank.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Icons.Trash2 className="w-3.5 h-3.5" /> 删除
                    </button>
                    <button className="px-5 py-1.5 rounded-full bg-[#07C160] text-white text-xs font-bold shadow-lg shadow-green-200 hover:shadow-green-300 transition-all">
                      开始
                    </button>
                 </div>
               </div>
             ))
          )}
        </div>
      </div>

      {/* 底部导航栏模拟 */}
      <div className="bg-white/90 backdrop-blur-lg border-t border-gray-100 px-6 py-2 pb-safe-area-bottom flex justify-around items-center z-50 fixed bottom-0 left-0 right-0 safe-area-bottom max-w-lg mx-auto">
         <div className="flex flex-col items-center gap-1 text-[#07C160]">
            <Icons.Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">首页</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-400 transition-colors cursor-not-allowed">
            <Icons.Trophy className="w-6 h-6" />
            <span className="text-[10px] font-medium">排行</span>
         </div>
      </div>
    </div>
  );

  const renderUpload = () => {
    const targetBank = banks.find(b => b.id === targetBankId);

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* 顶部导航 */}
        <div className="px-4 pt-4 pb-2 flex items-center border-b border-gray-50 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setCurrentView(AppView.Home)} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <Icons.ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div className="flex-1 text-center pr-10 font-bold text-lg text-gray-900">
             {targetBank ? '添加题目' : '新建题库'}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-10">
          {isProcessing ? (
            <div className="w-full max-w-sm text-center animate-fade-in-up">
               <div className="relative w-28 h-28 mx-auto mb-8">
                 <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-[#07C160] rounded-full border-t-transparent animate-spin"></div>
                 <Icons.Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#07C160] animate-pulse" />
               </div>
               
               <h3 className="text-xl font-bold text-gray-900 mb-3">
                 {processingStatus === 'extracting' ? '正在提取文本...' : 
                  processingStatus === 'switching_model' ? '正在切换极速引擎...' : 'AI 正在生成题目...'}
               </h3>
               <p className="text-[#07C160] font-medium mb-10 h-6 text-sm">
                 {processingDetail}
               </p>

               <Button variant="outline" onClick={handleCancelUpload} className="mx-auto px-10 rounded-full border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50">
                 取消生成
               </Button>
            </div>
          ) : (
            <div className="w-full max-w-md animate-fade-in-up">
              <div className="text-center mb-10">
                <p className="text-gray-500 font-medium">
                   {targetBank 
                     ? <span>正在向 <span className="text-gray-900 font-bold">{targetBank.title}</span> 添加</span> 
                     : "AI 智能解析文档，一键生成题库"}
                </p>
              </div>

              <FileUpload onFileSelect={handleFileUpload} isProcessing={isProcessing} />

              {errorMsg && (
                <div className="mt-8 p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-pulse border border-red-100 shadow-sm">
                  <Icons.AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const bank = banks.find(b => b.id === activeBankId);
    if (!bank) return null;
    const currentQ = bank.questions[quizState.currentQuestionIndex];

    const handleAnswer = (answer: string) => {
      const isCorrect = answer === currentQ.correctAnswer;
      setQuizState(prev => ({
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        answers: { ...prev.answers, [currentQ.id]: answer }
      }));
    };

    const handleNext = () => {
      if (quizState.currentQuestionIndex < bank.questions.length - 1) {
        setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
      } else {
        setQuizState(prev => ({ ...prev, isFinished: true }));
        setCurrentView(AppView.Result);
      }
    };

    return (
      <div className="flex flex-col h-screen bg-[#F7F8FA]">
        {/* 顶部进度条 */}
        <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-20 relative">
           <div className="flex items-center gap-2 text-gray-900 font-bold text-xl">
              <span className="text-[#07C160]">{quizState.currentQuestionIndex + 1}</span>
              <span className="text-gray-200 text-sm font-normal">/</span>
              <span className="text-gray-400 text-sm font-medium">{bank.questions.length}</span>
           </div>
           <button onClick={() => setCurrentView(AppView.Home)} className="p-2 -mr-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
             <Icons.X className="w-6 h-6" />
           </button>
           
           {/* Progress Line */}
           <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-100">
             <div 
               className="h-full bg-[#07C160] transition-all duration-300 ease-out shadow-[0_0_10px_#07C160]" 
               style={{ width: `${((quizState.currentQuestionIndex + 1) / bank.questions.length) * 100}%` }} 
             />
           </div>
        </div>

        {/* 答题区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
           <div className="max-w-lg mx-auto p-5 md:p-8 min-h-full">
              <QuizCard 
                question={currentQ}
                questionNumber={quizState.currentQuestionIndex + 1}
                totalQuestions={bank.questions.length}
                onAnswer={handleAnswer}
                onNext={handleNext}
                isLast={quizState.currentQuestionIndex === bank.questions.length - 1}
              />
           </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const bank = banks.find(b => b.id === activeBankId);
    if (!bank) return null;
    const percent = Math.round((quizState.score / bank.questions.length) * 100);

    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8 animate-fade-in-up relative overflow-hidden">
         {/* Confetti Background */}
         {percent >= 80 && (
           <div className="absolute inset-0 pointer-events-none opacity-50">
             <div className="absolute top-10 left-10 text-4xl animate-bounce delay-100">🎉</div>
             <div className="absolute top-20 right-20 text-3xl animate-bounce delay-300">✨</div>
             <div className="absolute bottom-40 left-20 text-4xl animate-bounce delay-500">🏆</div>
           </div>
         )}

         <div className="relative mb-8 transform scale-100 hover:scale-105 transition-transform duration-500">
            <div className="w-40 h-40 rounded-full border-[8px] border-green-50 flex items-center justify-center">
               <div className="w-32 h-32 bg-gradient-to-tr from-[#07C160] to-[#059669] rounded-full flex items-center justify-center shadow-2xl shadow-green-200">
                  <Icons.Trophy className="w-14 h-14 text-white drop-shadow-md" />
               </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-[#07C160] border border-green-100 px-6 py-1.5 rounded-full text-sm font-black shadow-lg">
               {percent === 100 ? "满分！太神了" : percent >= 80 ? "优秀！保持住" : percent >= 60 ? "挑战成功" : "继续加油"}
            </div>
         </div>

         <h1 className="text-2xl font-bold text-gray-900 mb-10 text-center px-4 leading-tight">{bank.title}</h1>

         <div className="grid grid-cols-2 gap-5 w-full max-w-xs mb-12">
            <div className="bg-[#F7F8FA] rounded-2xl p-5 border border-gray-100 text-center hover:bg-green-50/50 transition-colors">
               <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">正确率</div>
               <div className={`text-4xl font-black ${percent >= 60 ? 'text-[#07C160]' : 'text-orange-500'}`}>
                 {percent}<span className="text-base font-bold ml-1">%</span>
               </div>
            </div>
            <div className="bg-[#F7F8FA] rounded-2xl p-5 border border-gray-100 text-center hover:bg-green-50/50 transition-colors">
               <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">答对</div>
               <div className="text-4xl font-black text-gray-800">
                 {quizState.score}<span className="text-base font-bold text-gray-300 ml-1">/{bank.questions.length}</span>
               </div>
            </div>
         </div>

         <div className="w-full max-w-xs space-y-4">
            <Button onClick={() => startQuiz(bank.id)} fullWidth className="shadow-xl shadow-green-200/60 py-4 text-lg">
               <Icons.RotateCcw className="w-5 h-5 mr-2" /> 再来一次
            </Button>
            <Button variant="ghost" onClick={() => setCurrentView(AppView.Home)} fullWidth className="py-4 text-gray-500 hover:bg-gray-50">
               返回首页
            </Button>
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto bg-white shadow-2xl h-screen overflow-hidden relative">
      {currentView === AppView.Home && renderHome()}
      {currentView === AppView.Upload && renderUpload()}
      {currentView === AppView.Quiz && renderQuiz()}
      {currentView === AppView.Result && renderResult()}
    </div>
  );
};

export default App;