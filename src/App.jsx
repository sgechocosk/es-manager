import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Check,
  Copy,
  Key,
  X,
  Link as LinkIcon,
  ExternalLink,
  Sparkles,
  Bot,
  BookOpen,
  Loader2,
  Edit2,
  Briefcase,
  Ticket,
  Calendar,
  Trash2,
  Search,
  Download,
  Upload,
  Plus,
  Building2,
  LayoutList,
  Tags,
  ArrowUp,
  ArrowDown,
  Save,
} from "lucide-react";

// --- Utilities ---
const splitTags = (tagInput) => {
  if (Array.isArray(tagInput)) return tagInput;
  if (!tagInput || typeof tagInput !== "string") return [];
  return tagInput.split(/[,\s、，]+/).filter((t) => t.length > 0);
};

const getCurrentJSTTime = () => {
  const date = new Date();
  const jstDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const y = jstDate.getFullYear();
  const m = String(jstDate.getMonth() + 1).padStart(2, "0");
  const d = String(jstDate.getDate()).padStart(2, "0");
  const H = String(jstDate.getHours()).padStart(2, "0");
  const M = String(jstDate.getMinutes()).padStart(2, "0");
  const S = String(jstDate.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${H}:${M}:${S}+09:00`;
};

const sanitizeEntry = (entry) => {
  const now = getCurrentJSTTime();
  const rawQas = Array.isArray(entry.qas) ? entry.qas : [];
  const sanitizedQas = rawQas.map((qa) => ({
    id: qa.id || Date.now() + Math.random(),
    question: qa.question || "",
    answer: qa.answer || "",
    charLimit: qa.charLimit || "",
    tags: splitTags(qa.tags),
  }));

  return {
    id:
      entry.id ||
      `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    company: entry.company || "名称未設定",
    industry: entry.industry || "",
    status: entry.status || "未提出",
    selectionType: entry.selectionType || "",
    deadline: entry.deadline || "",
    note: entry.note || "",
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    qas: sanitizedQas,
  };
};

const callGeminiAPI = async (prompt) => {
  const apiKey = localStorage.getItem("GEMINI_API_KEY");
  if (!apiKey) {
    return "APIキーが設定されていません。右上の鍵アイコンからAPIキーを設定してください。";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AIからの応答がありませんでした。"
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "エラーが発生しました。もう一度お試しください。";
  }
};

const STATUS_COLORS = {
  未提出: "bg-gray-100 text-gray-600",
  作成中: "bg-blue-100 text-blue-600",
  提出済: "bg-emerald-100 text-emerald-600",
  採用: "bg-amber-100 text-amber-700",
  不採用: "bg-rose-50 text-rose-400",
};

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  const terms = highlight
    .toLowerCase()
    .split(/[\s\u3000]+/)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return <>{text}</>;

  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.toString().split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => t === part.toLowerCase()) ? (
          <span
            key={i}
            className="bg-yellow-200 text-slate-900 px-0.5 rounded-sm box-decoration-clone"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

// --- Components ---
const StatusBadge = ({ status }) => {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS["未提出"];
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border border-transparent whitespace-nowrap ${colorClass}`}
    >
      {status || "未提出"}
    </span>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="クリップボードにコピー"
      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 border ${
        copied
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const APIKeyModal = ({ isOpen, onClose }) => {
  const [key, setKey] = useState("");

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem("GEMINI_API_KEY") || "");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
      alert("APIキーを保存しました。");
    } else {
      localStorage.removeItem("GEMINI_API_KEY");
      alert("APIキーを削除しました。");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Key size={18} className="text-indigo-600" /> APIキー設定
          </h3>
          <button
            onClick={onClose}
            title="閉じる"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            有効なGemini APIキーを入力してください。
            <br />
            キーはブラウザのローカルストレージにのみ保存され、外部サーバ等へは送信されません。
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompanyUrlModal = ({ isOpen, onClose, entries, urls, onSave }) => {
  const [localUrls, setLocalUrls] = useState(urls);

  const companyNames = useMemo(() => {
    const entryCompanies = entries.map((e) => e.company).filter(Boolean);
    const urlCompanies = Object.keys(localUrls);
    const names = new Set([...entryCompanies, ...urlCompanies]);
    return Array.from(names).sort();
  }, [entries, localUrls]);

  useEffect(() => {
    if (isOpen) setLocalUrls(urls);
  }, [isOpen, urls]);

  const handleChange = (company, url) => {
    setLocalUrls((prev) => ({ ...prev, [company]: url }));
  };

  const handleSave = () => {
    onSave(localUrls);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-600" /> 企業URL設定
          </h3>
          <button onClick={onClose} title="閉じる">
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500 mb-4">
            企業ごとの採用マイページURLを設定できます。設定したURLは同じ企業名のすべてのエントリーに適用されます。
          </p>
          <div className="space-y-3">
            {companyNames.length === 0 && (
              <p className="text-sm text-slate-400">
                登録された企業がありません。
              </p>
            )}
            {companyNames.map((company) => (
              <div key={company} className="flex items-center gap-3">
                <div className="w-1/3 text-sm font-bold text-slate-700 truncate">
                  {company}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                    value={localUrls[company] || ""}
                    onChange={(e) => handleChange(company, e.target.value)}
                  />
                  {localUrls[company] && (
                    <a
                      href={localUrls[company]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex-shrink-0"
                      title="マイページを開く"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

const ReferenceSelectorModal = ({
  isOpen,
  onClose,
  entries,
  onSelect,
  currentQuestion,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const allQAs = useMemo(() => {
    let items = [];
    entries.forEach((entry) => {
      if (entry.qas) {
        entry.qas.forEach((qa) => {
          items.push({
            uniqueId: `${entry.id}_${qa.id}`,
            question: qa.question,
            answer: qa.answer,
            company: entry.company,
            industry: entry.industry || "",
            selectionType: entry.selectionType || "",
            tags: Array.isArray(qa.tags) ? qa.tags.join(" ") : qa.tags || "",
          });
        });
      }
    });
    return items;
  }, [entries]);

  const filteredQAs = useMemo(() => {
    if (!search) return allQAs;
    const terms = search
      .toLowerCase()
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);

    return allQAs.filter((item) => {
      const text = [
        item.company,
        item.question,
        item.answer,
        item.industry,
        item.selectionType,
        item.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return terms.every((term) => text.includes(term));
    });
  }, [allQAs, search]);

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selectedItems = allQAs.filter((item) =>
      selectedIds.has(item.uniqueId)
    );
    onSelect(selectedItems);
    setSearch("");
    setSelectedIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="px-5 py-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
            <BookOpen size={18} className="text-indigo-600" /> 過去の回答を選択
          </h3>
          <button onClick={onClose} title="閉じる">
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="bg-white border-b shrink-0">
          {currentQuestion && (
            <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-50 flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">
                現在の質問:
              </span>
              <p className="text-xs font-bold text-slate-700 line-clamp-1">
                {currentQuestion}
              </p>
            </div>
          )}

          <div className="px-5 py-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="企業、質問、タグ、回答を検索..."
                className="w-full pl-9 pr-4 py-1.5 border rounded-lg text-xs outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
          {filteredQAs.length === 0 && (
            <p className="text-center text-slate-400 py-20 text-sm">
              該当する回答がありません
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQAs.map((item) => {
              const isSelected = selectedIds.has(item.uniqueId);
              return (
                <div
                  key={item.uniqueId}
                  onClick={() => toggleSelection(item.uniqueId)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all h-48 flex flex-col shadow-sm hover:shadow-md ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300"
                      : "bg-white border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start gap-3 h-full overflow-hidden">
                    <div
                      className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col h-full">
                      <div className="flex flex-wrap items-center gap-2 mb-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                          {item.company}
                        </span>
                        {item.selectionType && (
                          <span className="text-[10px] text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded">
                            {item.selectionType}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 mb-2 shrink-0 line-clamp-2 border-b border-slate-50 pb-2">
                        Q. {item.question}
                      </p>

                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t bg-white rounded-b-xl flex justify-between items-center shrink-0">
          <span className="text-xs font-bold text-slate-500 ml-2">
            {selectedIds.size}件選択中
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              選択して適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIAssistant = ({
  question,
  answer,
  onApply,
  charLimit,
  company,
  industry,
  selectionType,
  allEntries,
}) => {
  const hasApiKey = localStorage.getItem("GEMINI_API_KEY");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState([]);

  if (!hasApiKey) return null;

  const handleAction = async (actionType, directRefs = null) => {
    if ((actionType === "refine" || actionType === "feedback") && !answer)
      return;

    setLoading(true);
    setMode(actionType);
    setResult("");

    let prompt = "";

    const contextInfo = `
      【応募先情報】
      ・企業名: ${company || "未定"}
      ・業界: ${industry || "未定"}
      ・選考種別: ${selectionType || "未定"}
    `;

    if (actionType === "refine") {
      prompt = `あなたは${
        industry || "その"
      }業界に精通したプロのキャリアアドバイザーです。
      応募先企業(${
        company || "指定なし"
      })の高評価を獲得できるよう、以下のES回答を推敲してください。
      ${contextInfo}
      【質問内容】${question}
      【元の回答】${answer}
      【ユーザー指示】${
        instruction ||
        "論理構成(結論→理由→具体例→結び)を整理し、STAR法を意識して具体的かつ熱意が伝わる文章にしてください。"
      }
      【制約条件】
      1. ${
        charLimit
          ? charLimit + "文字以内で作成すること。"
          : "元の文字数を大きく超えないこと。"
      }
      2. 挨拶文不要。推敲後のテキストのみ出力。
      3. 改行は使用せず、一続きの文章にすること。`;
    } else if (actionType === "feedback") {
      prompt = `あなたは${
        company || "企業"
      }の採用担当者です。以下のES回答を厳しく評価し、改善点を指摘してください。
      ${contextInfo}
      【質問内容】${question}
      ${charLimit ? `(制限: ${charLimit}文字)` : ""}
      【回答内容】${answer}
      【出力フォーマット】
      プレーンテキストで出力してください。
      【評価できる点】
      【改善すべき点】
      【具体的な修正案】`;
    } else if (actionType === "generate") {
      const refsToUse = directRefs || selectedRefs;
      const refsText = refsToUse
        .map(
          (r, i) =>
            `[参考${i + 1}] (企業: ${r.company})\nQ: ${r.question}\nA: ${
              r.answer
            }`
        )
        .join("\n\n");

      prompt = `あなたはプロのキャリアアドバイザーです。
      以下の「参考にする過去の回答」の内容や要素（強み、エピソードなど）をうまく活用・再構成して、
      今回の「新しい質問」に対する回答を新規に作成してください。

      ${contextInfo}

      【今回の質問】
      ${question}

      【参考にする過去の回答】
      ${refsText}

      【ユーザーの指示】
      ${
        instruction ||
        "過去の回答のエピソードを活かして、今回の質問に整合するように回答を作成してください。"
      }

      【制約条件】
      1. ${
        charLimit
          ? `必ず${charLimit}文字以内に収めること。`
          : "適切な長さで作成すること。"
      }
      2. 挨拶文不要。回答のテキストのみを出力すること。
      3. 改行は使用せず、一続きの文章にすること。`;
    }

    const aiText = await callGeminiAPI(prompt);
    setResult(aiText);
    setLoading(false);
  };

  const handleSelectReferences = (refs) => {
    setSelectedRefs(refs);
    setMode("generate");
    handleAction("generate", refs);
  };

  const close = () => {
    setResult("");
    setMode(null);
    setInstruction("");
    setSelectedRefs([]);
  };

  const isError =
    result.startsWith("エラー") ||
    result.startsWith("APIキー") ||
    result.startsWith("AIからの");

  return (
    <div className="mt-2">
      {!mode && (
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="AIへの指示 (例: 具体的に、簡潔に...)"
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleAction("refine")}
            disabled={!answer}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Sparkles size={12} /> 推敲
          </button>
          <button
            onClick={() => handleAction("feedback")}
            disabled={!answer}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 ml-auto sm:ml-0"
          >
            <Bot size={14} /> FB
          </button>
          <button
            onClick={() => setIsRefModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
          >
            <BookOpen size={12} /> 統合
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-sm text-slate-500 animate-pulse">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span>AIが思考中...</span>
        </div>
      )}

      {result && !loading && (
        <div className="mt-3 bg-white rounded-xl border-2 border-indigo-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
          <div className="bg-indigo-50/50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
              {mode === "feedback" ? <Bot size={16} /> : <Sparkles size={16} />}
              {mode === "feedback" ? "AIフィードバック" : "AI生成結果"}
            </div>
            <button
              onClick={close}
              title="閉じる"
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white font-sans">
            {result}
          </div>
          <div className="p-3 bg-slate-50 border-t border-indigo-50 flex justify-between items-center">
            <div className="text-xs font-mono text-slate-500 pl-1">
              {mode !== "feedback" && !isError && `${result.length}文字`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={close}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
              >
                閉じる
              </button>
              {mode !== "feedback" && !isError && (
                <button
                  onClick={() => {
                    onApply(result);
                    close();
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Check size={14} /> 反映する
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ReferenceSelectorModal
        isOpen={isRefModalOpen}
        onClose={() => setIsRefModalOpen(false)}
        entries={allEntries}
        onSelect={handleSelectReferences}
        currentQuestion={question}
      />
    </div>
  );
};

const QAItemDisplay = ({
  qa,
  companyName,
  status,
  selectionType,
  tags,
  showCompanyInfo = false,
  onEdit,
  highlight,
}) => (
  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group">
    {showCompanyInfo && (
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 text-sm">
            <HighlightText text={companyName} highlight={highlight} />
          </span>
          <StatusBadge status={status} />
          {selectionType && (
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <HighlightText text={selectionType} highlight={highlight} />
            </span>
          )}
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(qa.entryId);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
            title="編集"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    )}

    <div className="flex justify-between items-start gap-4 mb-2">
      <div className="flex gap-2 flex-1">
        <span className="text-indigo-600 font-black text-sm min-w-[20px]">
          Q.
        </span>
        <h3 className="font-bold text-sm text-slate-800 leading-relaxed">
          <HighlightText text={qa.question} highlight={highlight} />
          {qa.charLimit && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({qa.charLimit}文字)
            </span>
          )}
        </h3>
      </div>
      <CopyButton text={qa.answer} />
    </div>

    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 mb-3 pl-7">
      <HighlightText text={qa.answer} highlight={highlight} />
    </p>

    <div className="pl-7 flex flex-wrap justify-between items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {Array.isArray(tags) &&
          tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
            >
              #<HighlightText text={tag} highlight={highlight} />
            </span>
          ))}
      </div>
      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
        {qa.answer.length}文字
      </div>
    </div>
  </div>
);

const ESEntryDisplay = ({ entry, onEdit, onDelete, companyUrl, highlight }) => {
  const qas = entry.qas || [];
  const isExpired = entry.deadline && new Date(entry.deadline) < new Date();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">
            <HighlightText text={entry.company} highlight={highlight} />
          </h2>
          {companyUrl && (
            <a
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
              title="マイページを開く"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={16} />
            </a>
          )}
          <StatusBadge status={entry.status} />
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Briefcase size={12} />
            <HighlightText text={entry.industry} highlight={highlight} />
          </span>
          {entry.selectionType && (
            <span className="text-xs text-slate-500 flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded">
              <Ticket size={12} />
              <HighlightText text={entry.selectionType} highlight={highlight} />
            </span>
          )}
          {entry.deadline && (
            <span
              className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                isExpired
                  ? "bg-slate-100 text-slate-400"
                  : "bg-red-50 text-red-500"
              }`}
            >
              <Calendar size={12} /> 期限: {entry.deadline.replace("T", " ")}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(entry)}
            title="編集"
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            title="削除"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.note && (
        <div className="px-5 py-3 bg-amber-50/40 border-b border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          <span className="font-bold text-amber-600/80 mr-2 text-xs">NOTE</span>
          <HighlightText text={entry.note} highlight={highlight} />
        </div>
      )}

      <div className="divide-y divide-slate-50 bg-slate-50/30">
        {qas.length === 0 ? (
          <div className="p-5 text-sm text-slate-400 text-center">
            質問データがありません
          </div>
        ) : (
          qas.map((qa, idx) => (
            <div key={idx} className="p-5 hover:bg-white transition-colors">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex gap-2 flex-1">
                  <span className="text-indigo-600 font-black text-sm">Q.</span>
                  <h3 className="font-bold text-sm text-slate-700 leading-relaxed">
                    <HighlightText text={qa.question} highlight={highlight} />
                    {qa.charLimit && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        ({qa.charLimit}文字)
                      </span>
                    )}
                  </h3>
                </div>
                <CopyButton text={qa.answer} />
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 mb-3 pl-6">
                <HighlightText text={qa.answer} highlight={highlight} />
              </p>
              <div className="pl-6 flex flex-wrap justify-between items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(qa.tags) &&
                    qa.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
                      >
                        #<HighlightText text={tag} highlight={highlight} />
                      </span>
                    ))}
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  {(qa.answer || "").length}文字
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Default Data ---
const DEFAULT_FORM_DATA = {
  company: "",
  industry: "",
  myPageUrl: "",
  status: "未提出",
  selectionType: "",
  deadline: "",
  note: "",
  qas: [{ id: 0, question: "", answer: "", tags: "", charLimit: "" }],
};

export default function App() {
  // --- State ---
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("list");
  const [viewMode, setViewMode] = useState("company");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUrlSettingsOpen, setIsUrlSettingsOpen] = useState(false);
  const [companyUrls, setCompanyUrls] = useState({});

  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [initialFormState, setInitialFormState] = useState(null);

  // --- Effects ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasEntries = entries.length > 0;

      let isFormDirty = false;
      if (view === "form" && initialFormState) {
        const currentJson = JSON.stringify({
          ...formData,
          qas: formData.qas.map(({ id, ...rest }) => rest),
        });
        const initialJson = JSON.stringify({
          ...initialFormState,
          qas: initialFormState.qas.map(({ id, ...rest }) => rest),
        });
        isFormDirty = currentJson !== initialJson;
      }

      if (!hasEntries && !isFormDirty) {
        return;
      }

      if (hasEntries || isFormDirty) {
        e.preventDefault();
        const message =
          "データは保存されていません。リロードすると失われます。";
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [view, entries, formData, initialFormState]);

  // --- Helpers & Memos ---
  const isMatch = (text) => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    const terms = lowerQ.split(/[\s\u3000]+/).filter((t) => t.length > 0);
    if (!text) return false;
    return terms.some((term) => text.toLowerCase().includes(term));
  };

  const processedCompanyEntries = useMemo(() => {
    let result = entries;

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      const terms = lowerQ.split(/[\s\u3000]+/).filter((t) => t.length > 0);

      result = entries
        .map((entry) => {
          const entryBaseText =
            `${entry.company} ${entry.industry} ${entry.selectionType}`.toLowerCase();

          const filteredQAs = (entry.qas || []).filter((qa) => {
            const qaTags = Array.isArray(qa.tags) ? qa.tags.join(" ") : qa.tags;
            const combinedText =
              `${entryBaseText} ${qa.question} ${qa.answer} ${qaTags}`.toLowerCase();

            return terms.every((term) => combinedText.includes(term));
          });

          if (filteredQAs.length > 0) return { ...entry, qas: filteredQAs };
          return null;
        })
        .filter(Boolean);
    }

    return [...result].sort((a, b) => {
      if (a.updatedAt && b.updatedAt) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return (a.company || "").localeCompare(b.company || "", "ja");
    });
  }, [entries, searchQuery]);

  const flattenedQAs = useMemo(() => {
    let allItems = [];
    const lowerQ = searchQuery.toLowerCase();
    const terms = lowerQ.split(/[\s\u3000]+/).filter((t) => t.length > 0);

    entries.forEach((entry) => {
      if (entry.qas) {
        entry.qas.forEach((qa) => {
          const tags = splitTags(qa.tags);

          const fullContext = [
            entry.company,
            entry.industry,
            entry.selectionType,
            qa.question,
            qa.answer,
            tags.join(" "),
          ]
            .join(" ")
            .toLowerCase();

          const match = terms.every((term) => fullContext.includes(term));

          if (match) {
            allItems.push({
              ...qa,
              tagsArray: tags,
              companyName: entry.company || "名称未設定",
              status: entry.status || "未設定",
              selectionType: entry.selectionType,
              entryId: entry.id,
            });
          }
        });
      }
    });
    return allItems;
  }, [entries, searchQuery]);

  const tagGroups = useMemo(() => {
    const groups = {};
    flattenedQAs.forEach((item) => {
      if (item.tagsArray.length === 0) {
        const key = "タグなし";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      } else {
        item.tagsArray.forEach((tag) => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(item);
        });
      }
    });
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === "タグなし") return 1;
        if (b === "タグなし") return -1;
        return a.localeCompare(b, "ja");
      })
      .reduce((obj, key) => {
        obj[key] = groups[key];
        return obj;
      }, {});
  }, [flattenedQAs]);

  const entriesByStatus = useMemo(() => {
    const groups = {};
    processedCompanyEntries.forEach((entry) => {
      const status = entry.status || "未設定";
      if (!groups[status]) groups[status] = [];
      groups[status].push(entry);
    });
    return groups;
  }, [processedCompanyEntries]);

  // --- Handlers: Data & Form ---
  const handleSaveUrls = (newUrls) => setCompanyUrls(newUrls);

  const resetForm = () => {
    setView("list");
    setEditingId(null);
    const newState = {
      ...DEFAULT_FORM_DATA,
      qas: [
        { id: Date.now(), question: "", answer: "", tags: "", charLimit: "" },
      ],
    };
    setFormData(newState);
    setInitialFormState(null);
  };

  const handleCancel = () => {
    if (view === "form") {
      let isDirty = false;
      if (initialFormState) {
        const currentJson = JSON.stringify({
          ...formData,
          qas: formData.qas.map(({ id, ...rest }) => rest),
        });
        const initialJson = JSON.stringify({
          ...initialFormState,
          qas: initialFormState.qas.map(({ id, ...rest }) => rest),
        });
        isDirty = currentJson !== initialJson;
      }

      if (isDirty) {
        const isConfirmed = window.confirm(
          "編集中のデータは保存されていません。\n一覧画面に戻るとデータは失われますが、よろしいですか?"
        );
        if (!isConfirmed) return;
      }
      resetForm();
    } else {
      resetForm();
    }
  };

  const handleSave = () => {
    if (!formData.company) return;

    try {
      if (formData.myPageUrl) {
        setCompanyUrls((prev) => ({
          ...prev,
          [formData.company]: formData.myPageUrl,
        }));
      }

      const entryData = {
        ...formData,
        id: editingId,
        updatedAt: getCurrentJSTTime(),
      };
      const sanitized = sanitizeEntry(entryData);

      setEntries((prev) => {
        if (editingId) {
          return prev.map((e) => (e.id === editingId ? sanitized : e));
        } else {
          return [sanitized, ...prev];
        }
      });
      resetForm();
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました。");
    }
  };

  const handleDelete = (id) => {
    if (
      !confirm("この企業のエントリーシートを削除しますか?\n(URL設定は残ります)")
    )
      return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const startEdit = (entry) => {
    const fullEntry = entries.find((e) => e.id === entry.id) || entry;
    const editState = {
      company: fullEntry.company,
      industry: fullEntry.industry,
      status: fullEntry.status || "未提出",
      selectionType: fullEntry.selectionType || "",
      deadline: fullEntry.deadline || "",
      note: fullEntry.note || "",
      myPageUrl: companyUrls[fullEntry.company] || "",
      createdAt: fullEntry.createdAt,
      qas: fullEntry.qas
        ? fullEntry.qas.map((q) => ({
            ...q,
            tags: Array.isArray(q.tags) ? q.tags.join(", ") : q.tags || "",
          }))
        : [],
    };

    setFormData(editState);
    setInitialFormState(JSON.parse(JSON.stringify(editState)));
    setEditingId(fullEntry.id);
    setView("form");
  };

  const handleEditById = (id) => {
    const entry = entries.find((e) => e.id === id);
    if (entry) startEdit(entry);
  };

  const startNewEntry = () => {
    resetForm();
    const newState = {
      ...DEFAULT_FORM_DATA,
      qas: [
        { id: Date.now(), question: "", answer: "", tags: "", charLimit: "" },
      ],
    };
    setFormData(newState);
    setInitialFormState(JSON.parse(JSON.stringify(newState)));
    setView("form");
  };

  // --- Handlers: File IO ---
  const handleExport = () => {
    const exportData = {
      entries: entries,
      companyUrls: companyUrls,
      exportedAt: getCurrentJSTTime(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const jstNowStr = getCurrentJSTTime();
    const fileNameTime = jstNowStr.split("+")[0].replace(/[:T]/g, "-");

    const link = document.createElement("a");
    link.href = url;
    link.download = `es-data-${fileNameTime}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedJson = JSON.parse(e.target.result);
        let entriesToLoad = [];
        let urlsToLoad = {};

        if (Array.isArray(importedJson)) {
          entriesToLoad = importedJson;
        } else if (importedJson && Array.isArray(importedJson.entries)) {
          entriesToLoad = importedJson.entries;
          if (importedJson.companyUrls) urlsToLoad = importedJson.companyUrls;
        } else {
          alert(
            "無効なファイル形式です。es-data形式のJSONファイルを選択してください。"
          );
          return;
        }

        if (
          confirm(
            "現在のデータを破棄して、ファイルを読み込みますか?\n(未保存のデータは失われます)"
          )
        ) {
          let migratedUrls = { ...urlsToLoad };
          const normalizedData = entriesToLoad.map((item) => {
            if (item.myPageUrl && item.company) {
              migratedUrls[item.company] = item.myPageUrl;
            }
            return sanitizeEntry(item);
          });

          setEntries(normalizedData);
          setCompanyUrls((prev) => ({ ...prev, ...migratedUrls }));
        }
      } catch (error) {
        console.error(error);
        alert("ファイルの読み込みに失敗しました。JSON形式を確認してください。");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // --- Handlers: QA Array ---
  const addQA = () =>
    setFormData((p) => ({
      ...p,
      qas: [
        ...p.qas,
        { id: Date.now(), question: "", answer: "", tags: "", charLimit: "" },
      ],
    }));

  const moveQA = (index, direction) => {
    setFormData((p) => {
      const newQas = [...p.qas];
      if (direction === "up" && index > 0) {
        [newQas[index - 1], newQas[index]] = [newQas[index], newQas[index - 1]];
      } else if (direction === "down" && index < newQas.length - 1) {
        [newQas[index + 1], newQas[index]] = [newQas[index], newQas[index + 1]];
      }
      return { ...p, qas: newQas };
    });
  };

  const removeQA = (id) => {
    if (formData.qas.length > 1)
      setFormData((p) => ({ ...p, qas: p.qas.filter((q) => q.id !== id) }));
  };

  const updateQA = (id, f, v) =>
    setFormData((p) => ({
      ...p,
      qas: p.qas.map((q) => (q.id === id ? { ...q, [f]: v } : q)),
    }));

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleCancel}
            >
              <img
                src="/favicon.png"
                alt="ES Manager Icon"
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                ES Manager
              </h1>
            </div>
          </div>

          {view === "list" && (
            <div className="flex-1 w-full sm:w-auto flex gap-2 items-center">
              <div className="relative w-full max-w-lg group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="企業、質問、タグ、回答を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={handleExport}
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  title="ダウンロード"
                >
                  <Download size={18} />
                </button>
                <label
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="アップロード"
                >
                  <Upload size={18} />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setIsUrlSettingsOpen(true)}
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  title="企業URL設定"
                >
                  <LinkIcon size={18} />
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  title="APIキー設定"
                >
                  <Key size={18} />
                </button>
              </div>

              <button
                onClick={startNewEntry}
                title="新規作成"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg sm:px-4 flex items-center gap-1.5 shadow-md transition-all active:scale-95 ml-auto shrink-0"
              >
                <Plus size={18} />
                <span className="hidden md:inline font-medium">新規作成</span>
              </button>
            </div>
          )}

          {view !== "list" && (
            <div className="self-end sm:self-auto">
              <button
                onClick={handleCancel}
                title="一覧に戻る"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {view === "list" && (
          <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
            {[
              { id: "company", icon: Building2, label: "会社別" },
              { id: "status", icon: Check, label: "ステータス別" },
              { id: "question", icon: LayoutList, label: "質問別" },
              { id: "tag", icon: Tags, label: "タグ別" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  viewMode === mode.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <mode.icon size={14} />
                {mode.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {view === "list" ? (
          <div className="space-y-8">
            {/* View: Company List */}
            {viewMode === "company" && (
              <div className="grid gap-6">
                {processedCompanyEntries.length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    エントリーシートがありません。
                    <br />
                    右上のアップロードボタンからJSONを読み込むか、新規作成してください。
                  </div>
                )}
                {processedCompanyEntries.map((entry) => (
                  <ESEntryDisplay
                    key={entry.id}
                    entry={entry}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    companyUrl={companyUrls[entry.company]}
                    highlight={searchQuery}
                  />
                ))}
              </div>
            )}

            {/* View: Question List */}
            {viewMode === "question" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {flattenedQAs.length === 0 && (
                  <div className="col-span-2 text-center text-slate-400 py-10">
                    該当する質問はありません
                  </div>
                )}
                {flattenedQAs.map((item, idx) => (
                  <QAItemDisplay
                    key={`${item.entryId}-${idx}`}
                    qa={item}
                    tags={item.tagsArray}
                    companyName={item.companyName}
                    status={item.status}
                    selectionType={item.selectionType}
                    showCompanyInfo={true}
                    onEdit={handleEditById}
                    highlight={searchQuery}
                  />
                ))}
              </div>
            )}

            {/* View: Tag Group */}
            {viewMode === "tag" && (
              <div className="space-y-8">
                {Object.keys(tagGroups).length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    タグ付けされた質問はありません
                  </div>
                )}
                {Object.entries(tagGroups).map(([tagName, items]) => (
                  <div
                    key={tagName}
                    className="bg-slate-50/50 rounded-xl border border-slate-200 p-4"
                  >
                    <h3 className="text-sm font-bold text-indigo-700 mb-4 flex items-center gap-2">
                      <Tags size={16} /> #{tagName}
                      <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                        {items.length}
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {items.map((item, idx) => (
                        <QAItemDisplay
                          key={`${item.entryId}-${idx}`}
                          qa={item}
                          tags={item.tagsArray}
                          companyName={item.companyName}
                          status={item.status}
                          selectionType={item.selectionType}
                          showCompanyInfo={true}
                          onEdit={handleEditById}
                          highlight={searchQuery}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View: Status List */}
            {viewMode === "status" && (
              <div className="space-y-8">
                {Object.keys(entriesByStatus).length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    データはありません
                  </div>
                )}
                {["未提出", "作成中", "提出済", "採用", "不採用"].map(
                  (status) => {
                    const entries = entriesByStatus[status];
                    if (!entries || entries.length === 0) return null;
                    return (
                      <div
                        key={status}
                        className="bg-slate-50/50 rounded-xlYB border border-slate-200 p-4"
                      >
                        <div className="mb-4 flex items-center gap-2">
                          <StatusBadge status={status} />
                          <span className="text-xs text-slate-400 font-bold">
                            {entries.length}社
                          </span>
                        </div>
                        <div className="space-y-6">
                          {entries.map((entry) => (
                            <ESEntryDisplay
                              key={entry.id}
                              entry={entry}
                              onEdit={startEdit}
                              onDelete={handleDelete}
                              companyUrl={companyUrls[entry.company]}
                              highlight={searchQuery}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
                {Object.keys(entriesByStatus)
                  .filter(
                    (s) =>
                      ![
                        "未提出",
                        "作成中",
                        "提出済",
                        "採用",
                        "不採用",
                      ].includes(s)
                  )
                  .map((status) => (
                    <div
                      key={status}
                      className="bg-slate-50/50 rounded-xlYB border border-slate-200 p-4"
                    >
                      <h3 className="text-sm font-bold text-slate-600 mb-4 px-1">
                        {status}
                      </h3>
                      <div className="space-y-6">
                        {entriesByStatus[status].map((entry) => (
                          <ESEntryDisplay
                            key={entry.id}
                            entry={entry}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                            companyUrl={companyUrls[entry.company]}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          // --- Edit Form ---
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId ? "編集" : "新規登録"}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      企業名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.company}
                      onChange={(e) => {
                        const newCompany = e.target.value;
                        setFormData({
                          ...formData,
                          company: newCompany,
                          myPageUrl:
                            companyUrls[newCompany] || formData.myPageUrl || "",
                        });
                      }}
                      placeholder="例: 株式会社Tech"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      マイページURL
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="url"
                        className="w-full pl-3 pr-8 py-2 border rounded-lg outline-none focus:border-indigo-500"
                        value={formData.myPageUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            myPageUrl: e.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                      {formData.myPageUrl && (
                        <a
                          href={formData.myPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                          title="マイページを開く"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      業界・職種
                    </label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      placeholder="例: IT、エンジニア"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      ステータス
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500 bg-white"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      {["未提出", "作成中", "提出済", "採用", "不採用"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      選考種別
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.selectionType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          selectionType: e.target.value,
                        })
                      }
                      placeholder="例: 本選考、インターン"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      提出期限
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, deadline: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500">
                      備考
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.note || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                      placeholder="メモや関連事項"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <label className="text-sm font-bold text-slate-700 mb-4 block">
                    Q&A
                  </label>
                  <div className="space-y-6">
                    {formData.qas.map((qa, idx) => (
                      <div
                        key={qa.id}
                        className="bg-slate-50 p-5 rounded-xl border transition-all duration-200"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xs font-bold text-slate-400">
                            Q{idx + 1}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                文字数:
                              </span>
                              <input
                                type="text"
                                className="w-16 text-right text-xs bg-white border border-slate-200 rounded px-1 py-0.5 focus:border-indigo-500 outline-none placeholder-slate-300"
                                placeholder="なし"
                                value={qa.charLimit || ""}
                                onChange={(e) =>
                                  updateQA(qa.id, "charLimit", e.target.value)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveQA(idx, "up")}
                                disabled={idx === 0}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="質問を上に移動"
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                onClick={() => moveQA(idx, "down")}
                                disabled={idx === formData.qas.length - 1}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="質問を下に移動"
                              >
                                <ArrowDown size={16} />
                              </button>
                              <button
                                onClick={() => removeQA(qa.id)}
                                title="質問を削除"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <input
                            className="w-full bg-transparent font-bold text-slate-800 placeholder-slate-300 outline-none border-b focus:border-indigo-500 pb-1"
                            placeholder="質問内容"
                            value={qa.question}
                            onChange={(e) =>
                              updateQA(qa.id, "question", e.target.value)
                            }
                          />
                        </div>

                        <div className="mb-3">
                          <textarea
                            className="w-full p-3 text-sm border rounded-lg bg-white focus:border-indigo-500 outline-none min-h-[120px]"
                            placeholder="回答..."
                            value={qa.answer}
                            onChange={(e) =>
                              updateQA(qa.id, "answer", e.target.value)
                            }
                          />
                          <div className="text-right mt-1 flex justify-end gap-2 items-center">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                              {qa.answer.length}文字
                            </span>
                            {qa.charLimit && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  qa.answer.length > qa.charLimit
                                    ? "bg-rose-100 text-rose-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                上限: {qa.charLimit}
                              </span>
                            )}
                          </div>
                          <AIAssistant
                            question={qa.question}
                            answer={qa.answer}
                            charLimit={qa.charLimit}
                            company={formData.company}
                            industry={formData.industry}
                            selectionType={formData.selectionType}
                            onApply={(text) => updateQA(qa.id, "answer", text)}
                            allEntries={entries}
                          />
                        </div>
                        <input
                          className="w-full text-xs px-3 py-2 bg-white border rounded-md outline-none"
                          placeholder="タグ (例: 自己PR、ガクチカ)"
                          value={qa.tags}
                          onChange={(e) =>
                            updateQA(qa.id, "tags", e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addQA}
                    className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Plus size={16} /> 質問を追加
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={handleCancel}
                    className="px-5 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.company}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white shadow-md hover:bg-indigo-700 font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} /> 保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <APIKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CompanyUrlModal
        isOpen={isUrlSettingsOpen}
        onClose={() => setIsUrlSettingsOpen(false)}
        entries={entries}
        urls={companyUrls}
        onSave={handleSaveUrls}
      />
    </div>
  );
}
