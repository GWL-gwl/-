export const THEME_COLOR = "#07C160"; // 微信绿
export const BG_COLOR = "#F7F8FA";    // 微信背景灰

export const SAMPLE_ICONS = [
  "📚", "💡", "📝", "🔬", "🎨", "💻", "⚖️", "🩺", "📐", "🧠"
];

export const MOCK_BANKS = [
  {
    id: "demo-1",
    title: "JavaScript 基础测试",
    description: "前端开发核心概念",
    createdAt: Date.now(),
    icon: "💻",
    themeColor: "blue",
    questions: [
      {
        id: "q1",
        type: "single_choice",
        text: "在 JavaScript 中，以下哪个关键字用于定义块级作用域的变量？",
        options: ["var", "let", "function", "global"],
        correctAnswer: "let",
        explanation: "'let' 关键字允许你声明一个作用域被限制在块级中的变量、语句或表达式。与 var 不同，var 声明的变量只能是全局或者整个函数块的。"
      },
      {
        id: "q2",
        type: "true_false",
        text: "JavaScript 中的 null 和 undefined 是相等（==）的。",
        options: ["正确", "错误"],
        correctAnswer: "正确",
        explanation: "在 JavaScript 中，null == undefined 会返回 true，因为它们都代表“无”的值。但 null === undefined 会返回 false，因为类型不同。"
      }
    ]
  }
];