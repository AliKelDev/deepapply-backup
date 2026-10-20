import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Award,
  ThumbsUp,
  Lightbulb,
  Loader2,
  RotateCcw,
  Bot,
  User,
} from "lucide-react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";

// Compact markdown styling that fits inside the coach's chat bubbles.
const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-obsidian-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-obsidian-100 text-obsidian-800 text-[0.85em] font-mono">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline">
      {children}
    </a>
  ),
  h1: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-obsidian-200 pl-3 italic text-obsidian-600">
      {children}
    </blockquote>
  ),
};

const Markdown = ({ children }) => (
  <ReactMarkdown components={mdComponents}>{children || ""}</ReactMarkdown>
);
Markdown.propTypes = { children: PropTypes.string };

const scoreColor = (score) => {
  if (score >= 8) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
};

const InterviewCoach = ({ jobContext, candidateSummary, focusQuestions }) => {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'coach'|'candidate', content, meta? }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const { authFetch } = useAuth();

  const callCoach = async (history) => {
    const response = await authFetch("/.netlify/functions/interview-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobContext,
        candidateSummary,
        focusQuestions,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Please sign in with Google to practice with the coach.");
      }
      throw new Error("The coach is unavailable right now. Please try again in a moment.");
    }
    return response.json();
  };

  const appendCoachReply = (data) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content: data.reply,
        meta: {
          score: typeof data.score === "number" ? data.score : null,
          verdict: data.verdict || "",
          highlights: Array.isArray(data.highlights) ? data.highlights : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          sampleAnswer: data.sampleAnswer || "",
          done: Boolean(data.done),
        },
      },
    ]);
  };

  const startSession = async () => {
    setStarted(true);
    setLoading(true);
    setError(null);
    try {
      const data = await callCoach([]);
      appendCoachReply(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const candidateMsg = { role: "candidate", content: trimmed };
    const nextHistory = [...messages, candidateMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const data = await callCoach(nextHistory);
      appendCoachReply(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setStarted(false);
    setInput("");
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendAnswer();
    }
  };

  const sessionDone = messages.some((m) => m.role === "coach" && m.meta?.done);

  return (
    <div className="rounded-xl border border-obsidian-200 bg-gradient-to-b from-obsidian-50/60 to-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-obsidian-900 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-obsidian-900">Mock Interview Coach</h3>
            <p className="text-xs text-obsidian-500">
              Powered by DeepSeek · asks questions, grades your answers, helps you sharpen them
            </p>
          </div>
        </div>
        {started && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs text-obsidian-500 hover:text-obsidian-900 transition-colors"
            title="Start over"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
        )}
      </div>

      {!started ? (
        <div className="text-center py-8">
          <p className="text-sm text-obsidian-600 max-w-md mx-auto mb-5">
            Practice a live, role-specific interview. The coach asks one question at a time,
            scores each answer, and tells you exactly how to level it up.
          </p>
          <button
            onClick={startSession}
            className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg"
          >
            <Sparkles className="w-4 h-4" />
            Start mock interview
          </button>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="space-y-4 max-h-[28rem] overflow-y-auto pr-1 mb-4"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                      msg.role === "candidate"
                        ? "bg-obsidian-200 text-obsidian-700"
                        : "bg-obsidian-900 text-white"
                    }`}
                  >
                    {msg.role === "candidate" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "candidate"
                        ? "bg-obsidian-900 text-white rounded-tr-sm"
                        : "bg-white border border-obsidian-200 text-obsidian-800 rounded-tl-sm"
                    }`}
                  >
                    {/* Score badge */}
                    {msg.role === "coach" && msg.meta?.score !== null && (
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreColor(
                            msg.meta.score
                          )}`}
                        >
                          <Award className="w-3 h-3" />
                          {msg.meta.score}/10
                        </span>
                        {msg.meta.verdict && (
                          <span className="text-xs text-obsidian-500 italic">
                            {msg.meta.verdict}
                          </span>
                        )}
                      </div>
                    )}

                    {msg.role === "coach" ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Highlights */}
                    {msg.role === "coach" && msg.meta?.highlights?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {msg.meta.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-green-700">
                            <ThumbsUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.role === "coach" && msg.meta?.suggestions?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.meta.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sample answer */}
                    {msg.role === "coach" && msg.meta?.sampleAnswer && (
                      <details className="mt-3 group">
                        <summary className="text-xs font-medium text-obsidian-600 cursor-pointer hover:text-obsidian-900">
                          See a stronger example answer
                        </summary>
                        <div className="mt-2 text-xs text-obsidian-600 bg-obsidian-50 rounded-lg p-3">
                          <Markdown>{msg.meta.sampleAnswer}</Markdown>
                        </div>
                      </details>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-obsidian-900 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-obsidian-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-obsidian-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Coach is thinking…
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-600 mb-3">{error}</p>
          )}

          {!sessionDone ? (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…  (⌘/Ctrl + Enter to send)"
                rows={2}
                disabled={loading}
                className="flex-1 resize-none rounded-lg border border-obsidian-200 px-3 py-2 text-sm text-obsidian-800 focus:outline-none focus:ring-2 focus:ring-obsidian-900/20 disabled:opacity-60"
              />
              <button
                onClick={sendAnswer}
                disabled={loading || !input.trim()}
                className="p-3 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send answer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-center pt-2">
              <p className="text-sm text-obsidian-600 mb-3">That&apos;s a wrap — nice work. 🎉</p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-obsidian-300 text-obsidian-700 rounded-lg hover:bg-obsidian-50 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Run another session
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

InterviewCoach.propTypes = {
  jobContext: PropTypes.string,
  candidateSummary: PropTypes.string,
  focusQuestions: PropTypes.arrayOf(PropTypes.string),
};

export default InterviewCoach;
