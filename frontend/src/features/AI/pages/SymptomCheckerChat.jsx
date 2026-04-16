import React, { useEffect, useMemo, useRef, useState } from "react";
import Api from "../../../core/api";
import ChatComposer from "../components/ChatComposer";
import ChatMessage from "../components/ChatMessage";

function toConversationEntry(role, text) {
  return { role, parts: [{ text }] };
}

function formatDoctorsMessage({ specialty, doctors, fallbackMessage }) {
  if (Array.isArray(doctors) && doctors.length) {
    const lines = [];
    if (specialty) lines.push(`Recommended specialty: ${specialty}`);
    lines.push("\nAvailable doctors on DocApp:");
    for (const d of doctors) {
      const fee =
        d?.consultation_fee !== undefined && d?.consultation_fee !== null
          ? `LKR ${d.consultation_fee}`
          : "Consultation fee: N/A";
      lines.push(
        `- ${d.full_name} (${d.specialization}) — ${fee}` +
          (d.bio ? `\n  Bio: ${d.bio}` : ""),
      );
    }
    lines.push("\nYou can book an appointment from the Doctors section.");
    return lines.join("\n");
  }

  if (fallbackMessage && fallbackMessage !== "doctor_service_unavailable") {
    return fallbackMessage;
  }

  if (specialty) {
    return `Recommended specialty: ${specialty}`;
  }

  return "I couldn't find a matching specialty right now.";
}

export default function SymptomCheckerChat({ navigate }) {
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: "Hi! Tell me what you’re feeling and I’ll help with a preliminary assessment.\n\nIf this is an emergency, contact local emergency services.",
    },
  ]);

  // Stored in the backend-expected format: {role:'user'|'model', parts:[{text}]}
  const [conversationHistory, setConversationHistory] = useState(() => []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);

  const token = useMemo(() => {
    return sessionStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    // auto-scroll to bottom when new messages arrive
    listRef.current?.scrollTo?.({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const goBack = () => {
    if (navigate) navigate("/success/patient");
    else window.location.hash = "/success/patient";
  };

  const sendMessage = async (text) => {
    setError(null);

    if (!token) {
      setError("You’re not logged in. Please login again.");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const payload = {
        message: text,
        conversation_history: conversationHistory,
      };

      const res = await Api.post(
        "/api/v1/symptom-checker/analyze",
        payload,
        token,
      );

      if (res.status < 200 || res.status >= 300) {
        const msg =
          res.body?.message ||
          res.body?.error ||
          "AI service returned an error. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: msg },
        ]);
        return;
      }

      const assistantText =
        res.body?.message || "I couldn’t generate a response.";

      setMessages((prev) => [...prev, { role: "assistant", text: assistantText }]);
      setConversationHistory((prev) => [
        ...prev,
        toConversationEntry("user", text),
        toConversationEntry("model", assistantText),
      ]);

      // If the AI completed the assessment, show DocApp doctor suggestions (or specialty fallback).
      if (res.body?.assessment_complete) {
        const doctorMsg = formatDoctorsMessage({
          specialty: res.body?.specialty || res.body?.predicted_specialty,
          doctors: res.body?.doctors,
          fallbackMessage: res.body?.fallback_message,
        });

        if (doctorMsg) {
          setMessages((prev) => [...prev, { role: "assistant", text: doctorMsg }]);
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Network error talking to the AI service. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-128px)] bg-pagebg">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-dark">AI Symptom Checker</h1>
            <p className="mt-1 text-sm text-slate-600">
              Chat with the AI for a quick preliminary assessment.
            </p>
          </div>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-dark hover:border-primary"
            onClick={goBack}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="text-sm font-bold text-dark">Live Chat</div>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? "AI is typing…" : "Ready"}
            </div>
          </div>

          <div
            ref={listRef}
            className="h-[60vh] space-y-3 overflow-y-auto bg-pagebg p-4"
          >
            {messages.map((m, idx) => (
              <ChatMessage key={idx} role={m.role} text={m.text} />
            ))}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <ChatComposer disabled={loading} onSend={sendMessage} />
        </div>

        <div className="mt-4 text-xs text-slate-500">
          This tool is not a medical diagnosis. If symptoms are severe or worsening,
          seek professional medical help.
        </div>
      </div>
    </div>
  );
}
