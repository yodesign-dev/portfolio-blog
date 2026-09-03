"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useContactModal } from "./contact-modal-context";

type Status = "idle" | "submitting" | "success" | "error";

const QUICK_LINKS = [
  {
    label: "Gửi email trực tiếp",
    href: "mailto:nguyenbinhdesign@gmail.com",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Nhắn tin qua LinkedIn",
    href: "https://linkedin.com/in/binhnguyen1985",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    ),
  },
];

export function ContactModal() {
  const { isOpen, prefillEmail, closeModal } = useContactModal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (isOpen) {
      setEmail(prefillEmail);
      setStatus("idle");
    }
  }, [isOpen, prefillEmail]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!response.ok) throw new Error("failed");

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    // ⬇️ CẬP NHẬT: items-start (mobile) → sm:items-center. Trên mobile,
    // modal neo gần đỉnh màn hình (kèm py-8) thay vì canh giữa tuyệt đối
    // — tránh bị cắt mất phần đầu (nút đóng) khi bàn phím ảo mở, chiếm
    // gần nửa viewport, vốn hay xảy ra với items-center trên màn hình
    // thấp. Từ sm trở lên, màn hình đủ cao nên canh giữa như bình thường.
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm sm:items-center"
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        // ⬇️ CẬP NHẬT: p-6 sm:p-8 — bớt chật trên màn hình hẹp
        className="w-full max-w-lg rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            {/* ⬇️ CẬP NHẬT: text-xl sm:text-2xl — heading không quá to trên mobile */}
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Get in touch
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
              Mình luôn sẵn sàng lắng nghe về dự án, cơ hội hợp tác, hoặc chỉ đơn giản là một lời chào.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status !== "success" && (
          <div className="mt-5 flex flex-col gap-2.5">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 text-sm font-medium text-[#0b1432] transition hover:opacity-70"
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        )}

        {status === "success" ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-neutral-900">Đã gửi thành công!</p>
            <p className="mt-1 text-sm text-neutral-500">
              Mình sẽ phản hồi qua email sớm nhất có thể.
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* ⬇️ CẬP NHẬT: grid-cols-1 (mobile) → sm:grid-cols-2 — Tên và
                Tiêu đề xếp dọc trên mobile thay vì chen chật 2 cột */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Tên
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên của bạn"
                  // ⬇️ CẬP NHẬT: text-base (16px) thay vì text-sm (14px) —
                  // chặn iOS Safari tự động zoom khi focus vào input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 transition focus:border-[#00ddff] focus:outline-none focus:ring-2 focus:ring-[#00ddff]/30"
                />
              </div>
              <div>
                <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Tiêu đề
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Hợp tác dự án"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 transition focus:border-[#00ddff] focus:outline-none focus:ring-2 focus:ring-[#00ddff]/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 transition focus:border-[#00ddff] focus:outline-none focus:ring-2 focus:ring-[#00ddff]/30"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Tin nhắn
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bạn muốn nhắn gì?"
                className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 transition focus:border-[#00ddff] focus:outline-none focus:ring-2 focus:ring-[#00ddff]/30"
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Gửi thất bại, bạn thử lại nhé.
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#00ddff] px-4 py-3 text-sm font-semibold text-[#0b1432] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "submitting" ? (
                "Đang gửi..."
              ) : (
                <>
                  Gửi tin nhắn
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
