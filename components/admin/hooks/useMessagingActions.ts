"use client";

import { useState } from "react";
import { adminDb } from "../adminDb";

import type { MessageRow, QuestionRow } from "../types";
import type { ShowToastOptions, AppToastType } from "@/context/AppAlertContext";

interface UseMessagingActionsParams {
  setDbMessages: React.Dispatch<React.SetStateAction<MessageRow[]>>;
  setDbQuestions: React.Dispatch<React.SetStateAction<QuestionRow[]>>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
}

export function useMessagingActions({
  setDbMessages,
  setDbQuestions,
  showToast,
}: UseMessagingActionsParams) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyingToQ, setReplyingToQ] = useState<number | null>(null);
  const [qReplyText, setQReplyText] = useState("");

  const handleSendMessageReply = async (messageId: number) => {
    if (!replyText.trim()) {
      showToast("Lütfen bir cevap yazın.", "warning");
      return;
    }

    const now = new Date().toISOString();
    const { error } = await adminDb({ action: "update", table: "messages", data: { answer: replyText, answered_at: now }, filters: [{ column: "id", op: "eq", value: messageId }] });
    if (error) {
      showToast("Cevap gönderilemedi: " + error, "error");
      return;
    }

    showToast("Cevap müşteriye iletildi.", "success");
    setDbMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, answer: replyText, answered_at: now } : m)));
    setReplyingTo(null);
    setReplyText("");
  };

  const handleSendQuestionReply = async (questionId: number) => {
    if (!qReplyText.trim()) {
      showToast("Lütfen bir cevap yazın.", "warning");
      return;
    }

    const now = new Date().toISOString();
    const { error } = await adminDb({ action: "update", table: "questions", data: { answer: qReplyText, answered_at: now }, filters: [{ column: "id", op: "eq", value: questionId }] });
    if (error) {
      showToast("Cevap gönderilemedi: " + error, "error");
      return;
    }

    showToast("Ürün sorusu cevaplandı.", "success");
    setDbQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer: qReplyText, answered_at: now } : q)));
    setReplyingToQ(null);
    setQReplyText("");
  };

  const handleToggleQuestionApproval = async (questionId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await adminDb({ action: "update", table: "questions", data: { is_approved: newStatus }, filters: [{ column: "id", op: "eq", value: questionId }] });
    if (error) {
      showToast("Durum güncellenemedi: " + error, "error");
      return;
    }

    setDbQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, is_approved: newStatus } : q)));
    showToast(newStatus ? "Soru yayına alındı." : "Soru yayından kaldırıldı.", "success");
  };

  return {
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    replyingToQ,
    setReplyingToQ,
    qReplyText,
    setQReplyText,
    handleSendMessageReply,
    handleSendQuestionReply,
    handleToggleQuestionApproval,
  };
}
