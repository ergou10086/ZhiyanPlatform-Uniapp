// Markdown 格式检测和转换功能测试
// 测试用的 Markdown 格式示例
const markdownExamples = [
  {
    name: "标题",
    markdown: "# 一级标题\n\n## 二级标题\n\n### 三级标题",
    expectedPlain: "一级标题\n\n二级标题\n\n三级标题"
  },
  {
    name: "列表",
    markdown: "* 无序列表项1\n* 无序列表项2\n\n1. 有序列表项1\n2. 有序列表项2",
    expectedPlain: "无序列表项1\n无序列表项2\n\n有序列表项1\n有序列表项2"
  },
  {
    name: "强调",
    markdown: "这是**粗体**文本，这是*斜体*文本。",
    expectedPlain: "这是粗体文本，这是斜体文本。"
  },
  {
    name: "代码",
    markdown: "这是行内代码：`console.log('Hello')`\n\n这是代码块：\n```javascript\nfunction hello() {\n  console.log('Hello World');\n}\n```",
    expectedPlain: "这是行内代码：console.log('Hello')\n\n这是代码块：\nfunction hello() {\n  console.log('Hello World');\n}"
  },
  {
    name: "链接",
    markdown: "这是一个[链接文本](https://example.com)示例。",
    expectedPlain: "这是一个链接文本 (https://example.com)示例。"
  },
  {
    name: "表格",
    markdown: "| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据1 | 数据2 | 数据3 |",
    expectedPlain: "列1 列2 列3\n数据1 数据2 数据3"
  },
  {
    name: "引用",
    markdown: "> 这是一段引用文本\n> 这是引用的第二行",
    expectedPlain: "这是一段引用文本\n这是引用的第二行"
  },
  {
    name: "分隔线",
    markdown: "文本1\n\n---\n\n文本2",
    expectedPlain: "文本1\n\n文本2"
  }
];

// 检查是否为Markdown格式的函数
function isMarkdownFormat(text) {
  if (!text || typeof text !== 'string') return false
  
  // 检测常见的Markdown标记
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // 标题 # ## ###
    /^\*\s+.*/m,              // 无序列表
    /^\d+\.\s+.*/m,           // 有序列表
    /\*\*.*?\*\*/,            // 粗体 **text**
    /\*.*?\*/,                // 斜体 *text*
    /```[\s\S]*?```/,          // 代码块
    /`.*?`/,                  // 行内代码
    /^\[.*?\]:\s+.*$/m,       // 链接引用
    /\[.*?\]\(.*?\)/,         // 链接 [text](url)
    /^\|.*\|.*\|$/m,          // 表格
    /^\s*[-*_]{3,}\s*$/m,     // 分隔线 ---
  ]
  
  // 如果匹配任何一个Markdown模式，则认为是Markdown格式
  return markdownPatterns.some(pattern => pattern.test(text))
}

// 将Markdown转换为普通文本的函数
function convertMarkdownToPlainText(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return markdownText
  
  let plainText = markdownText
  
  // 处理代码块 ```code``` -> code
  plainText = plainText.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```/g, '').trim()
  })
  
  // 处理行内代码 `code` -> code
  plainText = plainText.replace(/`([^`]+)`/g, '$1')
  
  // 处理粗体 **text** -> text
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1')
  
  // 处理斜体 *text* -> text
  plainText = plainText.replace(/\*([^*]+)\*/g, '$1')
  
  // 处理标题 # Header -> Header
  plainText = plainText.replace(/^#{1,6}\s+(.+)$/gm, '$1')
  
  // 处理无序列表 * item -> item
  plainText = plainText.replace(/^\*\s+(.+)$/gm, '$1')
  
  // 处理有序列表 1. item -> item
  plainText = plainText.replace(/^\d+\.\s+(.+)$/gm, '$1')
  
  // 处理链接 [text](url) -> text (url)
  plainText = plainText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
  
  // 处理表格 - 移除表格标记，只保留内容
  plainText = plainText.replace(/^\|(.+)\|$/gm, (match, content) => {
    return content.split('|').map(cell => cell.trim()).join(' ')
  })
  
  // 移除分隔线
  plainText = plainText.replace(/^\s*[-*_]{3,}\s*$/gm, '')
  
  // 处理引用 > text -> text
  plainText = plainText.replace(/^>\s+(.+)$/gm, '$1')
  
  // 合并多个连续的空行
  plainText = plainText.replace(/\n{3,}/g, '\n\n')
  
  return plainText.trim()
}

// 测试函数
function runTests() {
  console.log('开始Markdown格式检测和转换测试...\n');
  
  markdownExamples.forEach((example, index) => {
    console.log(`测试 ${index + 1}: ${example.name}`);
    
    // 检测Markdown格式
    const isMarkdown = isMarkdownFormat(example.markdown);
    console.log(`Markdown格式检测: ${isMarkdown ? '✓ 检测到Markdown格式' : '✗ 未检测到Markdown格式'}`);
    
    // 转换为纯文本
    const plainText = convertMarkdownToPlainText(example.markdown);
    console.log(`转换结果: ${plainText}`);
    
    // 验证结果
    const isCorrect = plainText === example.expectedPlain;
    console.log(`结果验证: ${isCorrect ? '✓ 转换正确' : '✗ 转换不正确'}`);
    
    if (!isCorrect) {
      console.log(`期望结果: ${example.expectedPlain}`);
    }
    
    console.log('---\n');
  });
}

// 导出函数以便在uni-app中使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isMarkdownFormat,
    convertMarkdownToPlainText,
    runTests
  };
}

// 如果直接运行此文件，则执行测试
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  runTests();
}