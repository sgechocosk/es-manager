import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
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
  FileText,
  Filter,
  Sparkles,
  Bot,
  Loader2,
  LayoutList,
  Tags,
  Building2,
  AlignLeft,
  Calendar,
} from "lucide-react";

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "es-manager-v4";

// --- Utilities ---
const splitTags = (tagString) => {
  if (!tagString) return [];
  // 半角カンマ、全角カンマ、読点、スペースで分割
  return tagString.split(/[,\s、，]+/).filter((t) => t.length > 0);
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
    選考中: "bg-violet-100 text-violet-600",
    お見送り: "bg-rose-50 text-rose-400",
    内定: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border border-transparent whitespace-nowrap ${
        colors[status] || colors["未提出"]
      }`}
    >
      {status}
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
    } catch (err) {
      console.error(err);
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

const AIAssistant = ({ question, answer, onApply }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState(null); // 'refine' | 'feedback'
  const [instruction, setInstruction] = useState("");

  const handleAction = async (actionType) => {
    if (!answer) return;
    setLoading(true);
    setMode(actionType);
    setResult("");

    let prompt = "";
    if (actionType === "refine") {
      prompt = `あなたはプロのキャリアアドバイザーです。以下の就職活動のエントリーシート（ES）の回答を推敲してください。
      
      【質問内容】
      ${question}

      【元の回答】
      ${answer}

      【ユーザーからの推敲指示】
      ${
        instruction ||
        "特になし。論理構成を整理し、より魅力的な文章にしてください。"
      }
      
      【条件】
      1. 誤字脱字を修正し、適切な敬語表現を使うこと。
      2. 出力は推敲後のテキストのみを表示してください（マークダウンや挨拶文は不要）。`;
    } else if (actionType === "feedback") {
      prompt = `あなたは企業の採用担当者です。以下のエントリーシート（ES）の回答に対してフィードバックをしてください。
      
      【質問内容】
      ${question}

      【回答内容】
      ${answer}
      
      【出力条件】
      1. 評価できる点と改善すべき点を具体的に挙げてください。
      2. **重要: 出力はプレーンテキストのみで行ってください。マークダウン（**太字**や#見出し等）は一切使用しないでください。**
      3. 箇条書き記号には「・」を使用してください。`;
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
}) => (
  <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group">
    {showCompanyInfo && (
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 text-sm">
            {companyName}
          </span>
          <StatusBadge status={status} />
        </div>
        {selectionType && (
          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
            {selectionType}
          </span>
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

export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [viewMode, setViewMode] = useState("company"); // 'company' | 'question' | 'tag'
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    company: "",
    industry: "",
    status: "未提出",
    selectionType: "", // Changed from deadline
    qas: [{ id: Date.now(), question: "", answer: "", tags: "" }],
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error(error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "es_entries")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort(
        (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
      );
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- Data Processing for Views ---

  // 共通の検索ロジック
  const isMatch = (text) => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    const terms = lowerQ.split(/[\s\u3000]+/).filter((t) => t.length > 0);
    if (!text) return false;
    return terms.every((term) => text.toLowerCase().includes(term));
  };

  // 1. 会社別ビュー用のデータ処理
  const processedCompanyEntries = useMemo(() => {
    if (!searchQuery) return entries;

    return entries
      .map((entry) => {
        const isCompanyMatch =
          isMatch(entry.company) ||
          isMatch(entry.industry) ||
          isMatch(entry.selectionType);

        const filteredQAs = entry.qas.filter(
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
  }, [entries, searchQuery]);

  // 2. 質問一覧ビュー用のデータ処理（フラット化）
  const flattenedQAs = useMemo(() => {
    let allItems = [];
    entries.forEach((entry) => {
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
            companyName: entry.company,
            status: entry.status,
            selectionType: entry.selectionType,
            entryId: entry.id,
          });
        }
      });
    });
    return allItems;
  }, [entries, searchQuery]);

  // 3. タグ別ビュー用のデータ処理
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

  // --- Handlers ---

  const handleSave = async () => {
    if (!formData.company) return;
    if (!user) return;
    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "es_entries"
    );
    const payload = { ...formData, updatedAt: serverTimestamp() };
    try {
      if (editingId) await updateDoc(doc(collectionRef, editingId), payload);
      else
        await addDoc(collectionRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      resetForm();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "この企業のエントリーシートを削除しますか？\nこの操作は取り消せません。"
      )
    )
      return;
    await deleteDoc(
      doc(db, "artifacts", appId, "users", user.uid, "es_entries", id)
    );
  };

  const resetForm = () => {
    setView("list");
    setEditingId(null);
    setFormData({
      company: "",
      industry: "",
      status: "未提出",
      selectionType: "", // Reset
      qas: [{ id: Date.now(), question: "", answer: "", tags: "" }],
    });
  };

  const startEdit = (entry) => {
    setFormData({
      company: entry.company,
      industry: entry.industry,
      status: entry.status,
      selectionType: entry.selectionType || "", // Edit
      qas: entry.qas || [],
    });
    setEditingId(entry.id);
    setView("form");
  };

  // Form Operations
  const addQA = () =>
    setFormData((p) => ({
      ...p,
      qas: [...p.qas, { id: Date.now(), question: "", answer: "", tags: "" }],
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Header */}
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
              ES Manager
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
                    該当するエントリーシートはありません
                  </div>
                )}
                {processedCompanyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">
                          {entry.company}
                        </h2>
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
                          onClick={() => startEdit(entry)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50 bg-slate-50/30">
                      {entry.qas.map((qa, idx) => (
                        <div
                          key={idx}
                          className="p-5 hover:bg-white transition-colors"
                        >
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div className="flex gap-2 flex-1">
                              <span className="text-indigo-600 font-black text-sm">
                                Q.
                              </span>
                              <h3 className="font-bold text-sm text-slate-700 leading-relaxed">
                                {qa.question}
                              </h3>
                            </div>
                            <CopyButton text={qa.answer} />
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 mb-3 pl-6">
                            {qa.answer}
                          </p>
                          <div className="pl-6 flex flex-wrap gap-2">
                            {splitTags(qa.tags).map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                        "選考中",
                        "内定",
                        "お見送り",
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
                      placeholder="例: 夏インターン、本選考"
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
                          <div className="text-xs font-bold text-slate-400 mb-1">
                            Q{idx + 1}
                          </div>
                          <input
                            className="w-full bg-transparent font-bold text-slate-800 placeholder-slate-300 outline-none border-b focus:border-indigo-500 pb-1"
                            placeholder="質問内容 (例: ガクチカ)"
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
                          <div className="text-right mt-1">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                              {qa.answer.length}文字
                            </span>
                          </div>
                          <AIAssistant
                            question={qa.question}
                            answer={qa.answer}
                            onApply={(text) => updateQA(qa.id, "answer", text)}
                          />
                        </div>
                        <input
                          className="w-full text-xs px-3 py-2 bg-white border rounded-md outline-none"
                          placeholder="タグ (カンマ、読点区切り: ガクチカ、リーダー)"
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
