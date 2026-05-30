import { useState } from 'react';
import { Bot, Send, Lightbulb } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface SocraticTutorProps {
  knowledgePoints: { title: string; description: string }[];
  materialContent: string;
}

export default function SocraticTutor({ knowledgePoints, materialContent }: SocraticTutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '你好！我是你的AI学习助手。我不会直接给你答案，而是通过提问引导你自己思考。你可以问我任何学习相关的问题，准备好了吗？' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // 模拟苏格拉底式引导（实际应调用AI）
    await new Promise(r => setTimeout(r, 800));
    
    const guidance = generateGuidance(userMsg, knowledgePoints);
    setMessages(prev => [...prev, { role: 'ai', content: guidance }]);
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold text-purple-700">AI 学习助手</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">苏格拉底式引导答疑</h2>
        <p className="mt-2 text-slate-600">我不会直接给你答案，而是通过提问一步步引导你自己找到答案。</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* 消息列表 */}
        <div className="h-96 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'ai' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-6 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                <span className="animate-pulse">正在思考...</span>
              </div>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="输入你的问题，AI会引导你思考..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-purple-600 px-4 py-2.5 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {knowledgePoints.slice(0, 3).map((kp, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(`请帮我理解"${kp.title}"这个概念`);
                }}
                className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <Lightbulb className="inline h-3 w-3 mr-1" />
                {kp.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function generateGuidance(userMsg: string, knowledgePoints: { title: string; description: string }[]): string {
  const lower = userMsg.toLowerCase();
  
  if (lower.includes('怎么做') || lower.includes('怎么解') || lower.includes('不会')) {
    return '好的，我不会直接告诉你答案。让我们一步步来：\n\n首先，你能告诉我这道题给了哪些已知条件吗？试着把它们列出来。';
  }
  
  if (lower.includes('已知') || lower.includes('条件') || lower.includes('根据')) {
    return '很好！你已经理清了已知条件。\n\n接下来，你觉得这道题考察的是哪个知识点？试着回忆一下相关的公式或概念。';
  }
  
  if (lower.includes('公式') || lower.includes('概念') || lower.includes('知识点') || lower.includes('原理')) {
    return '不错！你已经找到了核心知识点。\n\n现在，试着把已知条件代入公式，看看能得到什么？不要怕算错，先试试看。';
  }
  
  if (lower.includes('答案') || lower.includes('结果') || lower.includes('算出来')) {
    return '你已经很接近了！\n\n现在检查一下：你的计算步骤有没有遗漏？单位换算是否正确？有没有考虑特殊情况？';
  }
  
  const kp = knowledgePoints.find(k => lower.includes(k.title));
  if (kp) {
    return `关于"${kp.title}"，我先不直接解释。\n\n你能用自己的话描述一下你对这个概念的理解吗？哪怕不完整也没关系。`;
  }
  
  return '这是一个好问题。在回答之前，我想先问你：\n\n关于这个问题，你已经知道了哪些信息？试着先说说你的理解。';
}
