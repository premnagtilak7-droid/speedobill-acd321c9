import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speedo-bot`;

const QUICK_QUESTIONS = [
  "How do I add menu items?",
  "How to generate a bill?",
  "How to activate a license key?",
  "How to manage staff?",
];

const SpeedoBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        upsert(err.error || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!resp.body) { upsert("No response received."); setIsLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      upsert("Connection error. Please check your network and try again.");
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:scale-110 hover:shadow-xl transition-all duration-200 animate-fade-in pulse"
          aria-label="Open Speedo Bot"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-orange-400/35 animate-ping" />
          <MessageCircle className="relative h-6 w-6" fill="white" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-48px)] rounded-2xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col border border-white/10"
          style={{
            background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)",
            animation: "slide-in-up 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-orange-500/20 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Speedo Bot</p>
                <p className="text-[10px] text-white/60">Your RMS Assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="h-4 w-4 text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-3 text-sm text-white/80">
                  👋 Hi! I'm <strong>Speedo Bot</strong>. I can help you navigate SpeedoBill. Ask me anything!
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Quick Questions</p>
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-orange-500 text-white rounded-br-sm"
                      : "bg-white/8 text-white/90 rounded-bl-sm"
                   }`}
                  style={msg.role === "assistant" ? { backgroundColor: "rgba(255,255,255,0.08)" } : undefined}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-orange-300 [&_h2]:text-sm [&_h2]:mt-2 [&_h2]:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 rounded-bl-sm" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-white/10 text-white placeholder:text-white/40 text-sm rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-orange-500/50 focus:outline-none transition-colors caret-orange-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

export default SpeedoBot;
