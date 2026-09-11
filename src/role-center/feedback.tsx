import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Notice } from "./ui";
export function useFeedback() {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const perform = (fn: () => unknown, success?: string) => {
    try {
      const result = fn();
      setError(false);
      if (success) setMessage(success);
      return result;
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "操作失败，请重试");
      return false;
    }
  };
  return {
    perform,
    feedback: message ? (
      <div className="rc-toast">
        <Notice error={error}>
          {message}
          <button
            className="rc-icon"
            aria-label="关闭提示"
            onClick={() => setMessage("")}
          >
            <X size={14} />
          </button>
        </Notice>
      </div>
    ) : null,
  };
}
