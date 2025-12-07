import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QuestionType, ParsingStatus } from "../types";

// Schema 用于规范 AI 输出结构
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "简体中文的问题描述" },
          type: { 
            type: Type.STRING, 
            enum: ["single_choice", "multi_choice", "true_false", "short_answer"],
            description: "问题类型"
          },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "选项列表 (包含A, B, C, D...)" 
          },
          correctAnswer: { type: Type.STRING, description: "正确答案文本或选项" },
          explanation: { type: Type.STRING, description: "简体中文的答案解析" }
        },
        required: ["text", "type", "correctAnswer"]
      }
    }
  },
  required: ["questions"]
};

// 动态加载库的帮助函数，防止白屏
async function getPdfJs() {
  // @ts-ignore
  const pdfjs = await import("pdfjs-dist");
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  }
  return pdfjs;
}

// 文本分块函数，增加分块大小以减少请求次数
// Gemini 2.5 Flash 拥有 1M 上下文，可以安全地处理更大块的输入
// 主要限制在于输出 Token (通常为 8k)，所以不能一次给太大，防止题目太多导致输出截断
const chunkText = (text: string, chunkSize: number = 25000): string[] => {
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    let end = Math.min(currentIndex + chunkSize, text.length);
    // 尝试在换行符处截断，避免截断句子
    if (end < text.length) {
      const nextNewLine = text.indexOf('\n', end);
      if (nextNewLine !== -1 && nextNewLine - end < 1000) {
        end = nextNewLine + 1;
      } else {
        const prevNewLine = text.lastIndexOf('\n', end);
        if (prevNewLine > currentIndex) {
          end = prevNewLine + 1;
        }
      }
    }
    chunks.push(text.slice(currentIndex, end));
    currentIndex = end;
  }
  return chunks;
};

// --- 文件解析函数 ---

const extractTextFromPDF = async (file: File): Promise<string> => {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // @ts-ignore
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText;
};

const extractTextFromDocx = async (file: File): Promise<string> => {
  // @ts-ignore
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const extractTextFromExcel = async (file: File): Promise<string> => {
  // @ts-ignore
  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let text = '';
  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    text += `Sheet: ${sheetName}\n`;
    text += XLSX.utils.sheet_to_csv(sheet);
    text += '\n\n';
  });
  return text;
};

// --- JSON 修复逻辑 ---
const cleanAndParseJSON = (text: string): any => {
  let cleanText = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // console.warn("JSON parse failed, attempting repair...", e);
    // 尝试找到最后一个闭合的对象
    const lastObjectEnd = cleanText.lastIndexOf("},");
    if (lastObjectEnd !== -1) {
      const repairedText = cleanText.substring(0, lastObjectEnd + 1) + "]}";
      try {
        return JSON.parse(repairedText);
      } catch (e2) {
        return { questions: [] };
      }
    }
    return { questions: [] };
  }
};

// --- 并发控制帮助函数 ---
async function asyncPool(poolLimit: number, array: any[], iteratorFn: (item: any, index: number) => Promise<any>) {
  const ret: Promise<any>[] = [];
  const executing: Promise<any>[] = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const p = Promise.resolve().then(() => iteratorFn(item, i));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

// --- AI 生成逻辑 ---

export const parseDocumentToQuestions = async (
  file: File,
  onStatusUpdate?: (status: ParsingStatus, detail?: string) => void
): Promise<{ title: string; questions: Question[] }> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fileName = file.name;
  
  // 1. 提取文本
  if (onStatusUpdate) onStatusUpdate('extracting', '正在极速识别文档内容...');
  let rawText = "";
  
  try {
    if (fileName.match(/\.(docx|doc)$/i)) {
      rawText = await extractTextFromDocx(file);
    } else if (fileName.match(/\.(xlsx|xls)$/i)) {
      rawText = await extractTextFromExcel(file);
    } else if (fileName.match(/\.pdf$/i)) {
      rawText = await extractTextFromPDF(file);
    } else {
      throw new Error("不支持的文件格式");
    }
  } catch (e) {
    console.error("Extraction error:", e);
    throw new Error("文档解析失败，可能是文件损坏或加密。");
  }

  if (!rawText.trim()) throw new Error("文档内容为空。");

  // 2. 分块处理
  const chunks = chunkText(rawText);
  const totalChunks = chunks.length;
  let processedCount = 0;

  // 定义单个分块的处理逻辑
  const processChunk = async (chunk: string, index: number): Promise<Question[]> => {
    const prompt = `
      请分析以下文本（片段 ${index + 1}/${totalChunks}）并提取测验题目。
      1. 提取所有可能的选择题、判断题。
      2. 严格输出 JSON 格式。
      3. 必须使用简体中文。
      4. 如果文本中断，请忽略不完整的题目。
    `;

    const contents = {
      parts: [{ text: `文档片段:\n${chunk}\n\n指令:${prompt}` }]
    };

    // 带超时控制的请求
    const generateWithTimeout = async (modelName: string, timeoutMs: number) => {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
       try {
          const response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: questionSchema,
              }
          });
          clearTimeout(timeoutId);
          return response;
       } catch (error) {
          clearTimeout(timeoutId);
          throw error;
       }
    };

    try {
      let response;
      // 降低超时时间，加快失败重试速度
      // 10秒超时，如果失败直接切 Lite 模型
      try {
        response = await generateWithTimeout('gemini-2.5-flash', 10000);
      } catch (err) {
        // console.log(`Chunk ${index} switching to Lite model`);
        response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: questionSchema,
            }
        });
      }

      const text = response.text;
      if (text) {
        const data = cleanAndParseJSON(text);
        if (data.questions && Array.isArray(data.questions)) {
          // 更新进度
          processedCount++;
          if (onStatusUpdate) {
             const percent = Math.round((processedCount / totalChunks) * 100);
             onStatusUpdate('processing', `AI 极速解析中 (${percent}%) - 正在处理第 ${processedCount}/${totalChunks} 块`);
          }
          return data.questions;
        }
      }
    } catch (chunkError) {
      console.warn(`Chunk ${index} failed:`, chunkError);
    }
    
    // 即使失败也更新进度
    processedCount++;
    if (onStatusUpdate) {
       const percent = Math.round((processedCount / totalChunks) * 100);
       onStatusUpdate('processing', `AI 极速解析中 (${percent}%)`);
    }
    
    return [];
  };

  if (onStatusUpdate) onStatusUpdate('processing', `开始并行处理 ${totalChunks} 个文档片段...`);

  // 3. 并发执行
  // 设置并发数为 3，既能加速又不至于触发频率限制
  const results = await asyncPool(3, chunks, processChunk);
  
  // 4. 合并结果
  const allQuestions = results.flat();

  if (allQuestions.length === 0) {
    throw new Error("未能从文档中提取到题目，请检查文档内容是否清晰。");
  }

  // 5. 后处理
  const processedQuestions: Question[] = allQuestions.map((q: any, index: number) => ({
    id: `gen-${Date.now()}-${index}`,
    text: q.text,
    type: q.type as QuestionType,
    options: q.options || [],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || "暂无详解"
  }));

  return {
    title: fileName.replace(/\.[^/.]+$/, ""),
    questions: processedQuestions
  };
};