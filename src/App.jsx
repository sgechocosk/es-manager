import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  Edit2,
  Briefcase,
  Save,
  X,
  Bot,
  Loader2,
  LayoutList,
  Tags,
  Building2,
  Sparkles,
  Calendar,
  Download,
  Upload,
} from "lucide-react";

// --- Utilities ---
const splitTags = (tagString) => {
  if (!tagString) return [];
  return tagString.split(/[,\s、，]+/).filter((t) => t.length > 0);
};

const sanitizeEntry = (entry) => {
  const now = new Date().toISOString();
  const sanitizedQas = Array.isArray(entry.qas)
    ? entry.qas.map((qa) => ({
        id: qa.id || Date.now() + Math.random(),
        question: qa.question || "",
        answer: qa.answer || "",
        tags: qa.tags || "",
        charLimit: qa.charLimit || "",
      }))
    : [];

  return {
    id:
      entry.id ||
      `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    company: entry.company || "名称未設定",
    industry: entry.industry || "",
    status: entry.status || "未提出",
    selectionType: entry.selectionType || "",
    qas: sanitizedQas,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };
};

const callGeminiAPI = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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

// --- Components ---
const StatusBadge = ({ status }) => {
  const colors = {
    未提出: "bg-gray-100 text-gray-600",
    作成中: "bg-blue-100 text-blue-600",
    提出済: "bg-emerald-100 text-emerald-600",
    採用: "bg-amber-100 text-amber-700",
    不採用: "bg-rose-50 text-rose-400",
    選考中: "bg-violet-100 text-violet-600",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border border-transparent whitespace-nowrap ${
        colors[status] || colors["未提出"]
      }`}
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
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <button
      onClick={handleCopy}
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

const AIAssistant = ({ question, answer, onApply, charLimit }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState(null);
  const [instruction, setInstruction] = useState("");

  const handleAction = async (actionType) => {
    if (!answer) return;
    setLoading(true);
    setMode(actionType);
    setResult("");

    let prompt = "";
    const limitCondition = charLimit
      ? `・文字数制限: ${charLimit}文字程度に収めること。`
      : "";

    if (actionType === "refine") {
      prompt = `あなたはプロのキャリアアドバイザーです。以下の就職活動のエントリーシート(ES)の回答を推敲してください。
      
      【質問内容】
      ${question}

      【元の回答】
      ${answer}

      【文字数制限】
      ${charLimit ? charLimit + "文字以内" : "特になし"}

      【ユーザーからの推敲指示】
      ${
        instruction ||
        "特になし。論理構成を整理し、より魅力的な文章にしてください。"
      }
      
      【条件】
      1. 誤字脱字を修正し、適切な敬語表現を使い、改行は使用しないこと。
      2. 出力は推敲後のテキストのみを、マークダウンや挨拶文無しで表示してください。
      3. ${limitCondition}`;
    } else if (actionType === "feedback") {
      prompt = `あなたは企業の採用担当者です。以下のエントリーシート(ES)の回答に対してフィードバックをしてください。
      
      【質問内容】
      ${question}
      ${charLimit ? `(文字数制限: ${charLimit}文字)` : ""}

      【回答内容】
      ${answer}
      (現在の文字数: ${answer.length}文字)
      
      【出力条件】
      1. 評価できる点と改善すべき点を具体的に挙げてください。
      2. 重要: 出力はプレーンテキストのみで行ってください。マークダウン(**太字**や#見出し等)は一切使用しないでください。
      3. 箇条書き記号には「・」を使用してください。
      4. 文字数制限がある場合は、過不足についてもコメントしてください。`;
    }

    const aiText = await callGeminiAPI(prompt);
    setResult(aiText);
    setLoading(false);
  };

  const close = () => {
    setResult("");
    setMode(null);
    setInstruction("");
  };

  return (
    <div className="mt-2">
      {!mode && (
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="例: リーダーシップを強調して、もっと簡潔に..."
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-l-lg focus:border-indigo-400 outline-none"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleAction("refine")}
            disabled={!answer}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-r-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Sparkles size={12} /> AI推敲
          </button>
          <button
            onClick={() => handleAction("feedback")}
            disabled={!answer}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 ml-auto sm:ml-0"
          >
            <Bot size={14} /> フィードバック
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-sm text-slate-500 animate-pulse">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span>AIが思考中... (質問内容: {question.substring(0, 30)}...)</span>
        </div>
      )}

      {result && !loading && (
        <div className="mt-3 bg-white rounded-xl border-2 border-indigo-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
          <div className="bg-indigo-50/50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
              {mode === "refine" ? <Sparkles size={16} /> : <Bot size={16} />}
              {mode === "refine" ? "AI推敲案" : "AIフィードバック"}
            </div>
            <button
              onClick={close}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white font-sans">
            {result}
          </div>
          <div className="p-3 bg-slate-50 border-t border-indigo-50 flex justify-end gap-2">
            <button
              onClick={close}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
            >
              閉じる
            </button>
            {mode === "refine" && (
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
      )}
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
}) => (
  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group">
    {showCompanyInfo && (
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 text-sm">
            {companyName}
          </span>
          <StatusBadge status={status} />
          {selectionType && (
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              {selectionType}
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
          {qa.question}
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
      {qa.answer}
    </p>

    <div className="pl-7 flex flex-wrap justify-between items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
          >
            #{tag}
          </span>
        ))}
      </div>
      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
        {qa.answer.length}文字
      </div>
    </div>
  </div>
);

const ESEntryDisplay = ({ entry, onEdit, onDelete }) => {
  const qas = entry.qas || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">{entry.company}</h2>
          <StatusBadge status={entry.status} />
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Briefcase size={12} /> {entry.industry}
          </span>
          {entry.selectionType && (
            <span className="text-xs text-slate-500 flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded">
              <Calendar size={12} /> {entry.selectionType}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
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
                    {qa.question}
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
                {qa.answer}
              </p>
              <div className="pl-6 flex flex-wrap justify-between items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {splitTags(qa.tags).map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
                    >
                      #{tag}
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

export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("list");
  const [viewMode, setViewMode] = useState("company");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    company: "",
    industry: "",
    status: "未提出",
    selectionType: "",
    qas: [{ id: Date.now(), question: "", answer: "", tags: "" }],
  });

  // --- Data Processing for Views ---
  const isMatch = (text) => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    const terms = lowerQ.split(/[\s\u3000]+/).filter((t) => t.length > 0);
    if (!text) return false;
    return terms.every((term) => text.toLowerCase().includes(term));
  };

  const processedCompanyEntries = useMemo(() => {
    let result = entries;

    if (searchQuery) {
      result = entries
        .map((entry) => {
          const isCompanyMatch =
            isMatch(entry.company) ||
            isMatch(entry.industry) ||
            isMatch(entry.selectionType);

          const filteredQAs = (entry.qas || []).filter(
            (qa) =>
              isCompanyMatch ||
              isMatch(qa.question) ||
              isMatch(qa.answer) ||
              isMatch(qa.tags)
          );

          if (isCompanyMatch) return entry;
          if (filteredQAs.length === 0) return null;
          return { ...entry, qas: filteredQAs };
        })
        .filter(Boolean);
    }

    return [...result].sort((a, b) => {
      // Sort by update time descending
      if (a.updatedAt && b.updatedAt) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return (a.company || "").localeCompare(b.company || "", "ja");
    });
  }, [entries, searchQuery]);

  const flattenedQAs = useMemo(() => {
    let allItems = [];
    entries.forEach((entry) => {
      if (entry.qas) {
        entry.qas.forEach((qa) => {
          const tags = splitTags(qa.tags);
          const match =
            isMatch(entry.company) ||
            isMatch(entry.industry) ||
            isMatch(entry.selectionType) ||
            isMatch(qa.question) ||
            isMatch(qa.answer) ||
            tags.some((t) => isMatch(t));

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
      .sort()
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

  // --- Handlers ---
  const resetForm = () => {
    setView("list");
    setEditingId(null);
    setFormData({
      company: "",
      industry: "",
      status: "未提出",
      selectionType: "",
      qas: [{ id: Date.now(), question: "", answer: "", tags: "" }],
    });
  };

  const handleSave = () => {
    if (!formData.company) return;

    try {
      const entryData = { ...formData, id: editingId };
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
      !confirm(
        "この企業のエントリーシートを削除しますか？\nこの操作は取り消せません。"
      )
    )
      return;

    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEditById = (id) => {
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      startEdit(entry);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `es-data-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.json`;
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
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          if (
            confirm(
              "現在のデータを破棄して、ファイルを読み込みますか？\n(未保存のデータは失われます)"
            )
          ) {
            const normalizedData = importedData.map((item) =>
              sanitizeEntry(item)
            );
            setEntries(normalizedData);
          }
        } else {
          alert(
            "無効なファイル形式です。es-backup形式のJSONファイルを選択してください。"
          );
        }
      } catch (error) {
        console.error(error);
        alert("ファイルの読み込みに失敗しました。JSON形式を確認してください。");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const startEdit = (entry) => {
    setFormData({
      company: entry.company,
      industry: entry.industry,
      status: entry.status || "未提出",
      selectionType: entry.selectionType || "",
      qas: entry.qas || [],
    });
    setEditingId(entry.id);
    setView("form");
  };

  // Form Operations
  const addQA = () =>
    setFormData((p) => ({
      ...p,
      qas: [
        ...p.qas,
        { id: Date.now(), question: "", answer: "", tags: "", charLimit: "" },
      ],
    }));

  const removeQA = (id) => {
    if (formData.qas.length > 1)
      setFormData((p) => ({ ...p, qas: p.qas.filter((q) => q.id !== id) }));
  };
  const updateQA = (id, f, v) =>
    setFormData((p) => ({
      ...p,
      qas: p.qas.map((q) => (q.id === id ? { ...q, [f]: v } : q)),
    }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            onClick={() => setView("list")}
          >
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Briefcase size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block tracking-tight">
              ES Manager{" "}
            </h1>
          </div>

          {view === "list" && (
            <div className="flex-1 w-full sm:w-auto flex gap-2">
              <div className="relative flex-1 max-w-lg group">
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
              <div className="flex gap-1">
                <button
                  onClick={handleExport}
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  title="データをエクスポート(JSON)"
                >
                  <Download size={18} />
                </button>
                <label className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer">
                  <Upload size={18} />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    title="データをインポート(JSON)"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="self-end sm:self-auto">
            {view === "list" ? (
              <button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg sm:px-4 sm:py-2 flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline font-medium">新規作成</span>
              </button>
            ) : (
              <button
                onClick={() => setView("list")}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* View Mode Switcher (List View Only) */}
        {view === "list" && (
          <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
            {[
              { id: "company", icon: Building2, label: "会社別" },
              { id: "status", icon: Check, label: "ステータス別" },
              { id: "question", icon: LayoutList, label: "質問一覧" },
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {view === "list" ? (
          <div className="space-y-8">
            {/* View 1: Company List */}
            {viewMode === "company" && (
              <div className="grid gap-6">
                {processedCompanyEntries.length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    エントリーシートがありません。
                    <br />
                    右上のインポートボタンからJSONを読み込むか、新規作成してください。
                  </div>
                )}
                {processedCompanyEntries.map((entry) => (
                  <ESEntryDisplay
                    key={entry.id}
                    entry={entry}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* View 2: Question List (Flat) */}
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
                  />
                ))}
              </div>
            )}

            {/* View 3: Tag Group */}
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
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View 4: Status List (ES Grouped) */}
            {viewMode === "status" && (
              <div className="space-y-8">
                {Object.keys(entriesByStatus).length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    データはありません
                  </div>
                )}
                {["未提出", "作成中", "提出済", "選考中", "採用", "不採用"].map(
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
                        "選考中",
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
                {/* Basic Info Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      企業名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="例: 株式会社Tech"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      業界
                    </label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
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
                      {[
                        "未提出",
                        "作成中",
                        "提出済",
                        "採用",
                        "不採用",
                        "選考中",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
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
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <label className="text-sm font-bold text-slate-700 mb-4 block">
                    Q&A
                  </label>
                  <div className="space-y-6">
                    {formData.qas.map((qa, idx) => (
                      <div
                        key={qa.id}
                        className="bg-slate-50 p-5 rounded-xl border relative group"
                      >
                        <button
                          onClick={() => removeQA(qa.id)}
                          className="absolute top-3 right-3 text-slate-300 hover:text-rose-500"
                        >
                          <X size={16} />
                        </button>
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-xs font-bold text-slate-400">
                              Q{idx + 1}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">
                                文字数制限:
                              </span>
                              <input
                                type="number"
                                className="w-16 text-right text-xs bg-white border border-slate-200 rounded px-1 py-0.5 focus:border-indigo-500 outline-none placeholder-slate-300"
                                placeholder="なし"
                                value={qa.charLimit || ""}
                                onChange={(e) =>
                                  updateQA(qa.id, "charLimit", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <input
                            className="w-full bg-transparent font-bold text-slate-800 placeholder-slate-300 outline-none border-b focus:border-indigo-500 pb-1"
                            placeholder="質問内容 (例: 自己PR、ガクチカ)"
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
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                              {qa.answer.length}文字
                            </span>
                          </div>
                          <AIAssistant
                            question={qa.question}
                            answer={qa.answer}
                            charLimit={qa.charLimit}
                            onApply={(text) => updateQA(qa.id, "answer", text)}
                          />
                        </div>
                        <input
                          className="w-full text-xs px-3 py-2 bg-white border rounded-md outline-none"
                          placeholder="タグ (カンマ区切り: 自己PR、ガクチカ)"
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
                    onClick={resetForm}
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
    </div>
  );
}
