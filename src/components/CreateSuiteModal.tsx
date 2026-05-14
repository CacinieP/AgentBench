"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { useSettings } from "@/lib/settings-context";
import { TestSuite, TestCase, EvaluatorType } from "@/lib/types";

interface CreateSuiteModalProps {
  open: boolean;
  onClose: () => void;
}

interface DraftCase {
  name: string;
  input: string;
  expectedOutput: string;
  category: string;
  evaluatorType: EvaluatorType | "";
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const emptyCase: DraftCase = {
  name: "",
  input: "",
  expectedOutput: "",
  category: "general",
  evaluatorType: "",
};

export default function CreateSuiteModal({
  open,
  onClose,
}: CreateSuiteModalProps) {
  const { addSuite } = useData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentType, setAgentType] = useState("chatbot");
  const [cases, setCases] = useState<DraftCase[]>([{ ...emptyCase }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const updateCase = (index: number, field: keyof DraftCase, value: string) => {
    setCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    if (errors[`case-${index}-${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`case-${index}-${field}`];
        return next;
      });
    }
  };

  const addCase = () => {
    setCases((prev) => [...prev, { ...emptyCase }]);
  };

  const removeCase = (index: number) => {
    if (cases.length <= 1) return;
    setCases((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!description.trim()) e.description = "Description is required";
    cases.forEach((c, i) => {
      if (!c.name.trim()) e[`case-${i}-name`] = "Required";
      if (!c.input.trim()) e[`case-${i}-input`] = "Required";
      if (!c.expectedOutput.trim())
        e[`case-${i}-expectedOutput`] = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const testCases: TestCase[] = cases.map((c) => ({
      id: genId("tc"),
      name: c.name.trim(),
      input: c.input.trim(),
      expectedOutput: c.expectedOutput.trim(),
      category: c.category.trim(),
      evaluator: c.evaluatorType ? { type: c.evaluatorType, threshold: 0.6 } : undefined,
    }));

    const suite: TestSuite = {
      id: genId("suite"),
      name: name.trim(),
      description: description.trim(),
      agentType,
      cases: testCases,
    };

    addSuite(suite);
    setName("");
    setDescription("");
    setAgentType("chatbot");
    setCases([{ ...emptyCase }]);
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setAgentType("chatbot");
    setCases([{ ...emptyCase }]);
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div
        className="glass-card w-full max-w-[640px] max-h-[85vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">New Test Suite</h2>
          <button
            onClick={handleClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Suite Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Customer Support Agent"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {errors.name && (
              <p className="text-[10px] text-[var(--red)] mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="What does this test suite evaluate?"
              rows={2}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            {errors.description && (
              <p className="text-[10px] text-[var(--red)] mt-1">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Agent Type
            </label>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="chatbot">Chatbot</option>
              <option value="code-review">Code Review</option>
              <option value="extraction">Data Extraction</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                Test Cases ({cases.length})
              </label>
              <button
                onClick={addCase}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[var(--accent-bg)] text-[var(--accent-light)] hover:opacity-80 transition-colors"
              >
                <Plus size={10} />
                Add Case
              </button>
            </div>

            <div className="space-y-3">
              {cases.map((tc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--border)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                      Case #{i + 1}
                    </span>
                    {cases.length > 1 && (
                      <button
                        onClick={() => removeCase(i)}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={tc.name}
                    onChange={(e) => updateCase(i, "name", e.target.value)}
                    placeholder="Test case name"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  {errors[`case-${i}-name`] && (
                    <p className="text-[10px] text-[var(--red)]">
                      {errors[`case-${i}-name`]}
                    </p>
                  )}
                  <textarea
                    value={tc.input}
                    onChange={(e) => updateCase(i, "input", e.target.value)}
                    placeholder="Input text"
                    rows={2}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  />
                  {errors[`case-${i}-input`] && (
                    <p className="text-[10px] text-[var(--red)]">
                      {errors[`case-${i}-input`]}
                    </p>
                  )}
                  <textarea
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateCase(i, "expectedOutput", e.target.value)
                    }
                    placeholder="Expected output / behavior"
                    rows={2}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  />
                  {errors[`case-${i}-expectedOutput`] && (
                    <p className="text-[10px] text-[var(--red)]">
                      {errors[`case-${i}-expectedOutput`]}
                    </p>
                  )}
                  <input
                    type="text"
                    value={tc.category}
                    onChange={(e) => updateCase(i, "category", e.target.value)}
                    placeholder="Category (e.g. billing, security)"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-[var(--text-muted)] shrink-0">Evaluator:</label>
                    <select
                      value={tc.evaluatorType}
                      onChange={(e) => updateCase(i, "evaluatorType", e.target.value)}
                      className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    >
                      <option value="">Default</option>
                      <option value="contains">Contains</option>
                      <option value="exact_match">Exact Match</option>
                      <option value="regex">Regex</option>
                      <option value="json_schema">JSON Schema</option>
                      <option value="llm_judge">LLM Judge</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Suite
          </button>
        </div>
      </div>
    </div>
  );
}
