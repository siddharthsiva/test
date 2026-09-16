import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { askPlanAssistant } from "../lib/assistant";

const SUGGESTED_QUESTIONS = [
  "What should we include in our go-bag?",
  "What's the nearest shelter to our home?",
  "How do I prepare for poor air quality?",
  "What's still left on our prep checklist?",
];

export function AssistantChat() {
  const [question, setQuestion] = useState("");
  const [log, setLog] = useState([]); // { question, answer, error }[] — this session only, not persisted
  const [asking, setAsking] = useState(false);

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setAsking(true);
    setQuestion("");
    try {
      const answer = await askPlanAssistant(q);
      setLog((prev) => [...prev, { question: q, answer }]);
    } catch {
      setLog((prev) => [
        ...prev,
        { question: q, error: "Couldn't reach the assistant — it may not be set up yet (see README)." },
      ]);
    }
    setAsking(false);
  }

  return (
    <div className="assistant-chat">
      <h2>
        <Sparkles size={17} strokeWidth={2.25} /> Ask About Your Plan
      </h2>
      <p className="family-plan-sub">
        Answers questions about your saved household plan and this app's real guidance — it won't
        invent an evacuation route or medical advice. Your question and saved plan are sent to
        Gemini (Google) to generate an answer.
      </p>

      {log.length > 0 && (
        <ul className="assistant-log">
          {log.map((entry, i) => (
            <li key={i}>
              <p className="assistant-question">{entry.question}</p>
              <p className={entry.error ? "assistant-error" : "assistant-answer"}>
                {entry.error ?? entry.answer}
              </p>
            </li>
          ))}
        </ul>
      )}

      {log.length === 0 && (
        <div className="assistant-suggestions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button type="button" key={q} className="assistant-chip" onClick={() => setQuestion(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleAsk} className="assistant-form">
        <input
          id="assistant-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What's in my go bag checklist still?"
          disabled={asking}
        />
        <button type="submit" disabled={asking || !question.trim()}>
          <Send size={14} strokeWidth={2.5} /> {asking ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
