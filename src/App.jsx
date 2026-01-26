import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  Check,
  Copy,
  Key,
  X,
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
  Settings,
  Plus,
  Building2,
  LayoutList,
  Tags,
  ArrowUp,
  ArrowDown,
  Save,
  AlertTriangle,
  PanelRight,
  PanelRightClose,
  Database,
  MapPin,
  Users,
  DollarSign,
  CalendarCheck,
  ListOrdered,
  FileText,
  Columns,
  StickyNote,
} from "lucide-react";

// --- Constants ---
const STORAGE_KEY_SETTINGS = "ES_MANAGER_SETTINGS";
const STORAGE_KEY_DATA = "ES_MANAGER_DATA";
const STORAGE_KEY_VIEW_SETTINGS = "ES_MANAGER_VIEW_SETTINGS";
const HEADER_HEIGHT = "57px";

const STYLE_PATTERNS = {
  keigo: {
    pattern:
      /(?:だ|である|った|できた|(?<!て)いる|(?<!で)ある|ない)(?=[。\n]|$)/g,
    color: "bg-rose-200",
  },
  joutai: {
    pattern:
      /(?:です|ます|でした|ました|ません|ましょう|ございます|おります|いたします)(?=[。\n]|$)/g,
    color: "bg-rose-200",
  },
};

const NG_WORD_PATTERN = {
  pattern:
    /(?:御社|御行|なので|ですが|お伺い|おっしゃられ|拝見させていただき|仰っていただき)/g,
  color: "bg-rose-200",
};

const COMPANY_DATA_COLUMNS = [
  { id: "company", label: "企業名", minWidth: "180px" },
  { id: "industry", label: "業界", minWidth: "120px" },
  { id: "myPageUrl", label: "マイページURL", minWidth: "200px" },
  { id: "recruitmentUrl", label: "採用HP URL", minWidth: "200px" },
  { id: "location", label: "本社所在地", minWidth: "150px" },
  { id: "workLocation", label: "勤務地", minWidth: "150px" },
  { id: "hiringNumber", label: "採用人数", minWidth: "100px" },
  { id: "avgSalary", label: "平均年収", minWidth: "100px" },
  { id: "startingSalary", label: "初任給", minWidth: "100px" },
  { id: "annualHoliday", label: "年間休日", minWidth: "100px" },
  { id: "selectionFlow", label: "選考フロー", minWidth: "350px" },
  { id: "idNumber", label: "ID番号", minWidth: "100px" },
  { id: "note", label: "備考", minWidth: "200px" },
];

// --- Utilities ---
const splitTags = (tagInput) => {
  if (Array.isArray(tagInput)) return tagInput;
  if (!tagInput || typeof tagInput !== "string") return [];
  return tagInput.split(/[,\s、，]+/).filter((t) => t.length > 0);
};

const getCurrentJSTTime = () => {
  const date = new Date();
  const jstDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
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
    note: qa.note || "",
    tags: splitTags(qa.tags),
  }));

  return {
    id:
      entry.id ||
      `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    company: entry.company || "名称未設定",
    status: entry.status || "未提出",
    selectionType: entry.selectionType || "",
    deadline: entry.deadline || "",
    note: entry.note || "",
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    qas: sanitizedQas,
  };
};

const normalizeCompanyData = (data) => {
  if (typeof data === "string") {
    return {
      myPageUrl: data,
      recruitmentUrl: "",
      industry: "",
      location: "",
      workLocation: "",
      hiringNumber: "",
      avgSalary: "",
      startingSalary: "",
      annualHoliday: "",
      selectionFlow: [],
      idNumber: "",
      note: "",
    };
  }
  return {
    myPageUrl: data?.myPageUrl || "",
    recruitmentUrl: data?.recruitmentUrl || "",
    industry: data?.industry || "",
    location: data?.location || "",
    workLocation: data?.workLocation || "",
    hiringNumber: data?.hiringNumber || "",
    avgSalary: data?.avgSalary || "",
    startingSalary: data?.startingSalary || "",
    annualHoliday: data?.annualHoliday || "",
    selectionFlow: Array.isArray(data?.selectionFlow) ? data.selectionFlow : [],
    idNumber: data?.idNumber || "",
    note: data?.note || "",
  };
};

// --- Gemini API Logic ---
const GEMINI_MODELS = [
  // "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  // "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const callGeminiAPI = async (systemInstruction, userPrompt, onModelChange) => {
  const apiKey = localStorage.getItem("GEMINI_API_KEY");
  if (!apiKey) {
    return "APIキーが設定されていません。右上の設定ボタンからAPIキーを設定してください。";
  }

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    if (onModelChange) onModelChange(model);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const isGemini3 = model.includes("gemini-3");
    const temperature = isGemini3 ? 1.0 : 0.8;

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: temperature,
        responseMimeType: "text/plain",
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.warn(
          `Model ${model} failed with status ${response.status}. Trying next...`,
        );
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "AIからの応答がありませんでした。"
      );
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  console.error("All Gemini models failed:", lastError);
  return "エラーが発生しました。もう一度お試しください。";
};

const STATUS_COLORS = {
  未提出: "bg-gray-100 text-gray-600",
  作成中: "bg-blue-100 text-blue-600",
  提出済: "bg-emerald-100 text-emerald-600",
  採用: "bg-amber-100 text-amber-700",
  不採用: "bg-rose-50 text-rose-400",
};

const HighlightText = ({ text, highlight, writingStyle, checkNgWords }) => {
  if (!text) return <>{text}</>;

  const searchTerms = highlight
    ? highlight
        .toLowerCase()
        .split(/[\s\u3000]+/)
        .filter((t) => t.length > 0)
    : [];

  const checkPatterns = [];
  if (checkNgWords) {
    checkPatterns.push({
      regex: NG_WORD_PATTERN.pattern,
      color: NG_WORD_PATTERN.color,
    });
  }
  if (writingStyle && STYLE_PATTERNS[writingStyle]) {
    checkPatterns.push({
      regex: STYLE_PATTERNS[writingStyle].pattern,
      color: STYLE_PATTERNS[writingStyle].color,
    });
  }

  if (searchTerms.length === 0 && checkPatterns.length === 0) {
    return <>{text}</>;
  }

  const searchRegexSource =
    searchTerms.length > 0
      ? `(${searchTerms
          .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})`
      : null;

  const allSources = [];
  if (searchRegexSource) allSources.push(searchRegexSource);
  checkPatterns.forEach((p) => allSources.push(`(${p.regex.source})`));

  if (allSources.length === 0) return <>{text}</>;

  const combinedRegex = new RegExp(allSources.join("|"), "gi");
  const parts = text.toString().split(combinedRegex);

  return (
    <>
      {parts
        .filter((part) => part !== undefined)
        .map((part, i) => {
          if (!part) return null;

          const isSearchMatch = searchTerms.some(
            (t) => t.toLowerCase() === part.toLowerCase(),
          );
          if (isSearchMatch) {
            return (
              <span
                key={i}
                className="bg-yellow-200 text-slate-900 px-0.5 rounded-sm box-decoration-clone"
              >
                {part}
              </span>
            );
          }

          for (const cp of checkPatterns) {
            if (new RegExp(cp.regex.source, "i").test(part)) {
              return (
                <span key={i} className={`${cp.color} rounded-sm px-0.5`}>
                  {part}
                </span>
              );
            }
          }

          return <span key={i}>{part}</span>;
        })}
    </>
  );
};

// --- Components ---
const AutoResizeTextarea = ({
  value,
  onChange,
  onFocus,
  placeholder,
  isActive,
  charLimit,
  writingStyle,
  checkNgWords,
}) => {
  const minHeightGhostRef = useRef(null);
  const contentGhostRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState("auto");

  const sharedClasses =
    "w-full p-3 text-sm font-sans leading-relaxed border rounded-lg break-words whitespace-pre-wrap";

  const highlightRenderer = useMemo(() => {
    if (!value) return null;

    const activePatterns = [];

    if (checkNgWords) {
      activePatterns.push({
        source: NG_WORD_PATTERN.pattern.source,
        color: NG_WORD_PATTERN.color,
      });
    }

    if (writingStyle && STYLE_PATTERNS[writingStyle]) {
      activePatterns.push({
        source: STYLE_PATTERNS[writingStyle].pattern.source,
        color: STYLE_PATTERNS[writingStyle].color,
      });
    }

    if (activePatterns.length === 0) return null;

    const combinedSource =
      "(" + activePatterns.map((p) => p.source).join("|") + ")";
    const combinedRegex = new RegExp(combinedSource, "g");

    const parts = value.split(combinedRegex);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        let appliedColor = "bg-yellow-200";

        if (checkNgWords && part.match(NG_WORD_PATTERN.pattern)) {
          appliedColor = NG_WORD_PATTERN.color;
        } else if (
          writingStyle &&
          STYLE_PATTERNS[writingStyle] &&
          part.match(STYLE_PATTERNS[writingStyle].pattern)
        ) {
          appliedColor = STYLE_PATTERNS[writingStyle].color;
        }

        return (
          <span
            key={i}
            className={`${appliedColor} rounded-sm box-decoration-clone`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [value, writingStyle, checkNgWords]);

  const dummyText = useMemo(() => {
    if (isActive && charLimit && Number(charLimit) > 0) {
      return "あ".repeat(Number(charLimit));
    }
    return isActive ? "\n\n\n" : "\n\n";
  }, [charLimit, isActive]);

  useLayoutEffect(() => {
    const minH = minHeightGhostRef.current?.scrollHeight || 0;
    const contentH = contentGhostRef.current?.scrollHeight || 0;

    const BORDER_OFFSET = 2;
    const targetHeight = Math.max(minH, contentH) + BORDER_OFFSET;

    setTextareaHeight(`${targetHeight}px`);
  }, [value, dummyText]);

  return (
    <div className="relative w-full group">
      <div
        aria-hidden="true"
        className={`absolute top-0 left-0 text-transparent border-transparent pointer-events-none ${sharedClasses}`}
        style={{ zIndex: 0 }}
      >
        {highlightRenderer}
      </div>

      <div
        ref={minHeightGhostRef}
        aria-hidden="true"
        className={`absolute top-0 left-0 invisible pointer-events-none border-transparent ${sharedClasses}`}
        style={{ zIndex: -1 }}
      >
        {dummyText}
      </div>

      <div
        ref={contentGhostRef}
        aria-hidden="true"
        className={`absolute top-0 left-0 invisible pointer-events-none border-transparent ${sharedClasses}`}
        style={{ zIndex: -1 }}
      >
        {value}
        {value && value.endsWith("\n") && <br />}
      </div>

      <textarea
        className={`relative z-10 bg-transparent focus:border-indigo-500 outline-none resize-none overflow-hidden block box-border transition-[height,border-color] duration-300 ease-in-out text-slate-700 ${sharedClasses}`}
        style={{ height: textareaHeight }}
        placeholder={placeholder}
        value={value}
        onFocus={onFocus}
        onChange={onChange}
      />

      <div className="absolute inset-0 bg-white rounded-lg -z-10 border border-slate-300 pointer-events-none" />
    </div>
  );
};

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

// --- Modal Components ---
const CompanyDataEditModal = ({
  isOpen,
  onClose,
  companyName,
  initialData,
  existingCompanies = [],
  onSave,
}) => {
  const [data, setData] = useState(normalizeCompanyData({}));
  const [newCompanyName, setNewCompanyName] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setData(normalizeCompanyData(initialData || {}));
      setNewCompanyName(companyName || "");
      setNameError("");
    }
  }, [isOpen, initialData, companyName]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNewCompanyName(val);

    if (!val.trim()) {
      setNameError("企業名を入力してください");
      return;
    }

    if (companyName && val.trim() === companyName) {
      setNameError("");
      return;
    }

    if (existingCompanies.includes(val.trim())) {
      setNameError("この企業名は既に登録されています");
    } else {
      setNameError("");
    }
  };

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFlowChange = (index, value) => {
    const newFlow = [...data.selectionFlow];
    newFlow[index] = value;
    setData((prev) => ({ ...prev, selectionFlow: newFlow }));
  };

  const handleSaveClick = () => {
    const targetName = newCompanyName.trim();

    if (!targetName) {
      alert("企業名を入力してください。");
      return;
    }

    if (nameError) {
      return;
    }

    onSave(targetName, data, companyName);
    onClose();
  };

  const addFlowStep = () => {
    setData((prev) => ({
      ...prev,
      selectionFlow: [...prev.selectionFlow, ""],
    }));
  };

  const removeFlowStep = (index) => {
    const newFlow = data.selectionFlow.filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, selectionFlow: newFlow }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            {companyName
              ? `企業データ編集: ${companyName}`
              : "企業データ新規作成"}
          </h3>
          <button onClick={onClose} title="閉じる">
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              企業名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none font-bold ${
                  nameError
                    ? "border-rose-300 focus:border-rose-500 bg-rose-50 text-rose-900"
                    : "focus:border-indigo-500"
                }`}
                placeholder="例: 株式会社Tech"
                value={newCompanyName}
                onChange={handleNameChange}
                autoFocus
              />
            </div>
            {nameError && (
              <p className="text-xs text-rose-500 mt-1 font-bold flex items-center gap-1 animate-in slide-in-from-top-1">
                <AlertTriangle size={12} /> {nameError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                マイページURL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="https://..."
                value={data.myPageUrl}
                onChange={(e) => handleChange("myPageUrl", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                採用HP URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="https://..."
                value={data.recruitmentUrl}
                onChange={(e) => handleChange("recruitmentUrl", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                業界
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="例: IT、メーカー"
                value={data.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                本社所在地
              </label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  placeholder="例: 東京都港区..."
                  value={data.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                勤務地
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  placeholder="例: 全国、東京本社"
                  value={data.workLocation}
                  onChange={(e) => handleChange("workLocation", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                ID番号
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="例: AA12345"
                value={data.idNumber}
                onChange={(e) => handleChange("idNumber", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                採用人数
              </label>
              <div className="relative">
                <Users
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 50名"
                  value={data.hiringNumber}
                  onChange={(e) => handleChange("hiringNumber", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                平均年収
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 800万"
                  value={data.avgSalary}
                  onChange={(e) => handleChange("avgSalary", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                初任給
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 25万"
                  value={data.startingSalary}
                  onChange={(e) =>
                    handleChange("startingSalary", e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                年間休日
              </label>
              <div className="relative">
                <CalendarCheck
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 125日"
                  value={data.annualHoliday}
                  onChange={(e) =>
                    handleChange("annualHoliday", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <ListOrdered size={14} /> 選考フロー
            </label>
            <div className="space-y-2">
              {data.selectionFlow.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300 w-6 text-right">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 border rounded-md text-sm outline-none focus:border-indigo-500"
                    value={step}
                    onChange={(e) => handleFlowChange(idx, e.target.value)}
                    placeholder={`ステップ ${idx + 1}`}
                  />
                  <button
                    onClick={() => removeFlowStep(idx)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={addFlowStep}
                className="ml-8 mt-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> フローを追加
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1.5">
              <FileText size={14} /> 備考
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500 min-h-[80px]"
              placeholder="メモや特記事項..."
              value={data.note}
              onChange={(e) => handleChange("note", e.target.value)}
            />
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
            onClick={handleSaveClick}
            disabled={!!nameError || (!companyName && !newCompanyName)}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

const ReferenceSidebar = ({
  isOpen,
  onClose,
  entries,
  editingId,
  appSettings,
}) => {
  const [search, setSearch] = useState("");

  const filteredQAs = useMemo(() => {
    let allItems = [];
    entries.forEach((entry) => {
      if (editingId && entry.id === editingId) return;

      if (entry.qas) {
        entry.qas.forEach((qa) => {
          if (!qa.answer || !qa.answer.trim()) return;

          allItems.push({
            uniqueId: `${entry.id}_${qa.id}`,
            question: qa.question,
            answer: qa.answer,
            company: entry.company,
            selectionType: entry.selectionType,
            industry: entry.industry || "",
            note: qa.note || "",
            tags: Array.isArray(qa.tags) ? qa.tags : [],
          });
        });
      }
    });

    if (!search) return allItems;

    const terms = search
      .toLowerCase()
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);

    return allItems.filter((item) => {
      const text = [
        item.company,
        item.industry,
        item.selectionType,
        item.question,
        item.answer,
        item.note,
        item.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return terms.every((term) => text.includes(term));
    });
  }, [entries, search, editingId]);

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      className={`fixed right-0 w-full sm:w-96 bg-white shadow-2xl z-40 border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{
        top: HEADER_HEIGHT,
        height: `calc(100vh - ${HEADER_HEIGHT})`,
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600" />
          ES参照
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors"
          title="閉じる"
        >
          <PanelRightClose size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-slate-100 bg-white shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="企業、質問、タグ、回答を検索..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
        {filteredQAs.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-10">
            {search ? "該当する回答がありません" : "データがありません"}
          </div>
        )}
        {filteredQAs.map((item) => (
          <div
            key={item.uniqueId}
            className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="flex justify-between items-start mb-2 gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px] block">
                    <HighlightText text={item.company} highlight={search} />
                  </span>
                  {item.selectionType && (
                    <span className="text-[10px] text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded">
                      <HighlightText
                        text={item.selectionType}
                        highlight={search}
                      />
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  <HighlightText text={item.question} highlight={search} />
                </p>
              </div>
              <div className="shrink-0">
                <CopyButton text={item.answer} />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-100 pr-1">
              <HighlightText
                text={item.answer}
                highlight={search}
                writingStyle={
                  appSettings?.showChecksInList ? appSettings.writingStyle : ""
                }
                checkNgWords={
                  appSettings?.showChecksInList
                    ? appSettings.checkNgWords
                    : false
                }
              />
            </p>

            {item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                  >
                    #<HighlightText text={tag} highlight={search} />
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

const SettingsModal = ({
  isOpen,
  onClose,
  initialSettings,
  initialAutoSave,
  onSettingsSave,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [autoSave, setAutoSave] = useState(false);
  const [writingStyle, setWritingStyle] = useState("");
  const [checkNgWords, setCheckNgWords] = useState(true);
  const [showChecksInList, setShowChecksInList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("GEMINI_API_KEY") || "");
      setAutoSave(initialSettings?.autoSave || false);
      setWritingStyle(initialSettings?.writingStyle || "");
      setCheckNgWords(initialSettings?.checkNgWords ?? true);
      setShowChecksInList(initialSettings?.showChecksInList ?? false);
    }
  }, [isOpen, initialSettings]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("GEMINI_API_KEY", apiKey.trim());
    } else {
      localStorage.removeItem("GEMINI_API_KEY");
    }

    const newSettings = {
      autoSave,
      writingStyle,
      checkNgWords,
      showChecksInList,
    };
    onSettingsSave(newSettings);

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Settings size={18} className="text-indigo-600" /> 設定
          </h3>
          <button
            onClick={onClose}
            title="閉じる"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* API Key Section */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Key size={16} /> APIキー設定
            </h4>
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              Gemini
              APIキーを入力してください。キーはブラウザにのみ保存されます。
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm"
            />
          </div>

          <hr className="border-slate-100" />

          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Edit2 size={16} /> 文章校正ハイライト設定
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 space-y-5 bg-white">
                <div>
                  <h5 className="text-xs font-bold text-slate-500 mb-2">
                    1. NGワードチェック
                  </h5>
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checkNgWords}
                      onChange={(e) => setCheckNgWords(e.target.checked)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-700">
                        不適切な表現を警告
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        「御社」「なので」などの話し言葉や不適切な表現を警告
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-500 mb-2">
                    2. 文体統一チェック
                  </h5>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="writingStyle"
                        value="keigo"
                        checked={writingStyle === "keigo"}
                        onChange={(e) => setWritingStyle(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div>
                        <span className="block text-sm font-bold text-slate-700">
                          敬体 (です・ます)
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          「だ・である」調が混ざっている場合に警告
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="writingStyle"
                        value="joutai"
                        checked={writingStyle === "joutai"}
                        onChange={(e) => setWritingStyle(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div>
                        <span className="block text-sm font-bold text-slate-700">
                          常体 (だ・である)
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          「です・ます」調が混ざっている場合に警告
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="writingStyle"
                        value=""
                        checked={writingStyle === ""}
                        onChange={(e) => setWritingStyle(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        指定なし
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5">
                        チェックを行いません。
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={showChecksInList}
                      onChange={(e) => setShowChecksInList(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-indigo-900">
                      一覧画面にも適用する
                    </span>
                    <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                      リスト表示や参照パネルでも、校正箇所をハイライトします。
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Auto Save Section */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Save size={16} /> データの自動保存
            </h4>
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
              />
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-700">
                  ブラウザにデータを保存する
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                  有効にすると、入力したデータがブラウザ(localStorage)に自動的に保存され、次回起動時に復元されます。
                </span>
                {!autoSave && (
                  <span className="block text-xs text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    OFFの場合、ブラウザを閉じるとデータは消えます。
                  </span>
                )}
                {autoSave && (
                  <span className="block text-xs text-indigo-600 mt-1.5 flex items-center gap-1 font-medium">
                    <Check size={12} />
                    次回起動時にデータが復元されます。
                  </span>
                )}
              </div>
            </label>
            {!autoSave && initialAutoSave && (
              <p className="text-xs text-rose-500 mt-2 font-bold">
                ※
                設定を保存すると、現在ブラウザに記憶されているデータは削除されます。
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              設定を保存
            </button>
          </div>
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
  appSettings,
  excludedUniqueId,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const allQAs = useMemo(() => {
    let items = [];
    entries.forEach((entry) => {
      if (entry.qas) {
        entry.qas.forEach((qa) => {
          if (!qa.answer || !qa.answer.trim()) return;

          items.push({
            uniqueId: `${entry.id}_${qa.id}`,
            question: qa.question,
            answer: qa.answer,
            company: entry.company,
            industry: entry.industry || "",
            selectionType: entry.selectionType || "",
            note: qa.note || "",
            tags: Array.isArray(qa.tags) ? qa.tags.join(" ") : qa.tags || "",
            updatedAt: entry.updatedAt,
          });
        });
      }
    });

    return items.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0);
      const dateB = new Date(b.updatedAt || 0);
      return dateB - dateA;
    });
  }, [entries]);

  const filteredQAs = useMemo(() => {
    let targetList = allQAs;

    if (excludedUniqueId) {
      targetList = targetList.filter(
        (item) => item.uniqueId !== excludedUniqueId,
      );
    }

    if (!search) return targetList;

    const terms = search
      .toLowerCase()
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);

    return targetList.filter((item) => {
      const text = [
        item.company,
        item.question,
        item.answer,
        item.industry,
        item.selectionType,
        item.note,
        item.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return terms.every((term) => text.includes(term));
    });
  }, [allQAs, search, excludedUniqueId]);

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selectedItems = allQAs.filter((item) =>
      selectedIds.has(item.uniqueId),
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
                          <HighlightText
                            text={item.company}
                            highlight={search}
                          />
                        </span>
                        {item.selectionType && (
                          <span className="text-[10px] text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded">
                            <HighlightText
                              text={item.selectionType}
                              highlight={search}
                            />
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 mb-2 shrink-0 line-clamp-2 border-b border-slate-50 pb-2">
                        Q.{" "}
                        <HighlightText
                          text={item.question}
                          highlight={search}
                        />
                      </p>

                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          <HighlightText
                            text={item.answer}
                            highlight={search}
                            writingStyle={
                              appSettings?.showChecksInList
                                ? appSettings.writingStyle
                                : ""
                            }
                            checkNgWords={
                              appSettings?.showChecksInList
                                ? appSettings.checkNgWords
                                : false
                            }
                          />
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
  note,
  entryId,
  qaId,
  writingStyle,
}) => {
  const hasApiKey = localStorage.getItem("GEMINI_API_KEY");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [currentModel, setCurrentModel] = useState("");

  if (!hasApiKey) return null;

  const handleAction = async (actionType, directRefs = null) => {
    if ((actionType === "refine" || actionType === "feedback") && !answer)
      return;

    setLoading(true);
    setMode(actionType);
    setResult("");
    setCurrentModel("");

    const styleInstruction =
      writingStyle === "keigo"
        ? "回答の文体は敬体(です・ます調)で統一してください。"
        : writingStyle === "joutai"
          ? "回答の文体は常体(だ・である調)で統一してください。"
          : "";

    const contextInfo = `
    【応募先情報】
    ・企業名: ${company || "未定"}
    ・業界: ${industry || "未定"}
    ・選考種別: ${selectionType || "未定"}`;

    const commonInputSection = `
    【質問内容】
    ${question}

    【補足事項/前提条件】
    ${note || "なし"}
    ${charLimit ? `(制限: ${charLimit}文字)` : ""}`;

    const commonConstraints = `
    【制約条件】
    1. ${
      charLimit
        ? charLimit + "文字以内で作成すること。"
        : "元の文字数を大きく超えないこと。"
    }
    2. 挨拶文不要。推敲後のテキストのみ出力。
    3. マークダウンの装飾は使わず、プレーンテキストで出力。
    4. 改行は使用せず、一続きの文章にすること。`;

    let systemPrompt = "";
    let userPrompt = "";

    // Refine Action
    if (actionType === "refine") {
      systemPrompt = `あなたはプロのキャリアアドバイザーです。
      応募先企業(${
        company || "指定なし"
      })の高評価を獲得できるよう、ES回答を推敲してください。
      出力形式はプレーンテキストのみとし、挨拶文や改行は含めないでください。
      ${styleInstruction}`;

      userPrompt = `${contextInfo}
      ${commonInputSection}

      【元の回答】
      ${answer}

      【ユーザー指示】
      ${
        instruction ||
        "質問に対する適切な回答をすることを前提に、基本的には論理構成(結論→理由→具体例→結び)を整理し、STAR法を意識して具体的かつ熱意が伝わる文章にしてください。"
      }

      【思考プロセス】
      1. 設問タイプの判定と適用:
        質問が「志望動機・自己PR」などの論理重視型の場合 → PREP法(結論→理由→具体例→結論)で構成してください。
        質問が「ガクチカ・困難を乗り越えた経験」などのプロセス重視型の場合 → STAR法(結論→状況→課題→行動→結果→結論)で構成してください。
      2. 過剰な情報の抑制:
        文脈上不自然な場合、企業名や職種名を無理に文中に挿入しないでください。あくまで「質問への回答」として自然な日本語にしてください。
      3. 文章の洗練:
        冗長な表現を削ぎ落とし、熱意と具体性が伝わる表現に書き換えてください。

      ${commonConstraints}`;

      // Feedback Action
    } else if (actionType === "feedback") {
      systemPrompt = `あなたは採用担当者です。
      以下のES回答を「構成の適切さ」「企業とのマッチ度」「読みやすさ」の観点から厳しく評価し、改善点を指摘してください。
      ${styleInstruction}`;

      userPrompt = `${contextInfo}
      ${commonInputSection}

      【回答内容】
      ${answer}

      【ユーザー指示】
      ${
        instruction ||
        "この回答の良い点と悪い点を具体的に指摘し、改善案を提案してください。"
      }

      【思考プロセス】
      評価を出力する前に、内部的に以下のチェックを行ってください（出力には含めなくて良いですが、評価に反映させてください）:
      1. 構成チェック: 設問タイプに対し、適切なフレームワーク(PREPまたはSTAR)が使われているか。論理の飛躍はないか。
      2. マッチ度チェック: 応募先企業の業界や特性に適したアピールになっているか。
      3. 可読性チェック: 結論ファーストになっているか。採用担当者が数秒で要旨を掴めるか。
      また、出力にはマークダウンの装飾を一切含めないでください。

      【評価指示】
      以下の項目についてフィードバックしてください。
      【評価できる点】
      【改善すべき点】
      【具体的な修正案】`;

      // Generate Action
    } else if (actionType === "generate") {
      const refsToUse = directRefs || selectedRefs;
      const refsText = refsToUse
        .map(
          (r, i) =>
            `[参考${i + 1}] (企業: ${r.company})\nQ: ${r.question}\nA: ${r.answer}`,
        )
        .join("\n\n");

      // With Existing Answer
      if (answer && answer.trim()) {
        systemPrompt = `あなたはプロのキャリアアドバイザーです。
        以下の「現在の回答案」をベースにし、「参考にする過去の回答」の表現や要素（言葉遣い、強み、エピソードなど）をうまく取り入れて、質問内容に対する回答を作成してください。
        挨拶文や改行は含めず、回答本文をプレーンテキストで出力してください。
        ${styleInstruction}`;

        userPrompt = `${contextInfo}
        ${commonInputSection}

        【現在の回答案】
        ${answer}

        【参考にする過去の回答】
        ${refsText}

        【ユーザー指示】
        ${
          instruction ||
          "現在の回答案の意図や文脈を維持しつつ、参考にする回答の良い言い回しや要素を反映させて質問内容に対する回答を新規に作成してください。"
        }

        【思考プロセス】
        1. 入力情報の分析: 「現在の回答案」に含まれる具体的なエピソードや主張は変えずに、まず質問タイプを判定し、自己PR・志望動機ならPREP法、経験記述ならSTAR法で構成してください。
        2. 参考回答の活用:
          内容が現在の回答と共通する場合: 参考回答の「視点や詳細な情報」も適宜取り入れ、内容を拡充してください。
          内容が現在の回答と異なる場合: 参考回答の「構成・トーン・言い回し」を参考にし、内容は現在の回答案をベースに整えてください。
        3. 自然な文章化: 企業名や業界名は特別必要がない場合、文中に挿入することは避けてください。あくまで自然な回答に仕上げてください。

        ${commonConstraints}`;

        // Without Existing Answer
      } else {
        systemPrompt = `あなたはプロのキャリアアドバイザーです。
        以下の「参考にする過去の回答」の強み、エピソードなどの要素をうまく活用・再構成して、質問内容に対する回答を新規に作成してください。
        挨拶文や改行は含めず、回答本文をプレーンテキストで出力してください。
        ${styleInstruction}`;

        userPrompt = `${contextInfo}
        ${commonInputSection}

        【参考にする過去の回答】
        ${refsText}

        【ユーザー指示】
        ${
          instruction ||
          "過去の回答のエピソードを活かして、質問内容に整合するように回答を作成してください。"
        }

        【思考プロセス】
        1. 構成の決定: まず質問タイプを判定し、自己PR・志望動機ならPREP法、経験記述ならSTAR法で構成してください。
        2. 要素の統合: 複数の参考回答がある場合、質問内容に最も適した要素を組み合わせ、質問内容に最適で論理的な回答を作成してください。
        3. 自然な文章化: 企業名や業界名は特別必要がない場合、文中に挿入することは避けてください。あくまで自然な回答に仕上げてください。

        ${commonConstraints}`;
      }
    }

    const aiText = await callGeminiAPI(
      systemPrompt,
      userPrompt,
      setCurrentModel,
    );
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
    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
      {!mode && (
        <div className="flex gap-2 flex-wrap items-center justify-end">
          <div className="w-full sm:flex-1 sm:w-auto min-w-[200px]">
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
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
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
          <span>AIが思考中... {currentModel && `(${currentModel})`}</span>
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
        appSettings={undefined}
        excludedUniqueId={entryId && qaId ? `${entryId}_${qaId}` : null}
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
  appSettings,
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
              onEdit(qa.entryId, qa.id);
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

    {qa.note && (
      <div className="mb-2 pl-7 pb-2 border-b border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">
        <HighlightText text={qa.note} highlight={highlight} />
      </div>
    )}

    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 mb-3 pl-7">
      <HighlightText
        text={qa.answer}
        highlight={highlight}
        writingStyle={
          appSettings?.showChecksInList ? appSettings.writingStyle : ""
        }
        checkNgWords={
          appSettings?.showChecksInList ? appSettings.checkNgWords : false
        }
      />
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

const ESEntryDisplay = ({
  entry,
  onEdit,
  onDelete,
  companyUrl,
  highlight,
  appSettings,
}) => {
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(entry, qa.id);
                    }}
                    title="編集"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <CopyButton text={qa.answer} />
                </div>
              </div>

              {qa.note && (
                <div className="mb-2 pl-6 pb-2 border-b border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">
                  <HighlightText text={qa.note} highlight={highlight} />
                </div>
              )}

              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 mb-3 pl-6">
                <HighlightText
                  text={qa.answer}
                  highlight={highlight}
                  writingStyle={
                    appSettings?.showChecksInList
                      ? appSettings.writingStyle
                      : ""
                  }
                  checkNgWords={
                    appSettings?.showChecksInList
                      ? appSettings.checkNgWords
                      : false
                  }
                />
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

const DraftDisplay = ({ draft, onEdit, onDelete, highlight, appSettings }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-orange-50/50 to-white flex justify-between items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">
            <HighlightText text={draft.title} highlight={highlight} />
          </h2>
          <span className="text-xs text-slate-500">
            {new Date(draft.updatedAt).toLocaleDateString()} 更新
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(draft)}
            title="編集"
            className="p-1.5 text-slate-400 hover:text-orange-600 rounded-md transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(draft.id);
            }}
            title="削除"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-50 bg-slate-50/30">
        {(draft.items || []).map((item, idx) => (
          <div key={idx} className="p-5 hover:bg-white transition-colors">
            <div className="flex justify-between items-start gap-4 mb-2">
              <div className="flex gap-2 flex-1">
                <span className="text-orange-500 font-black text-sm">Q.</span>
                <h3 className="font-bold text-sm text-slate-700 leading-relaxed">
                  <HighlightText text={item.question} highlight={highlight} />
                </h3>
              </div>
              <CopyButton text={item.answer} />
            </div>

            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7 pl-6">
              <HighlightText
                text={item.answer}
                highlight={highlight}
                writingStyle={
                  appSettings?.showChecksInList ? appSettings.writingStyle : ""
                }
                checkNgWords={
                  appSettings?.showChecksInList
                    ? appSettings.checkNgWords
                    : false
                }
              />
            </p>
          </div>
        ))}
        {(!draft.items || draft.items.length === 0) && (
          <div className="p-5 text-sm text-slate-400 text-center">
            メモがありません
          </div>
        )}
      </div>
    </div>
  );
};

const DraftEditor = ({
  data,
  onChange,
  onSave,
  onCancel,
  companyNames = [],
  writingStyle,
  checkNgWords,
}) => {
  const [activeItemId, setActiveItemId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveClick(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data]);

  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日のメモ`;
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    const isCompanySelect = companyNames.includes(val);
    let newTitle = val;

    if (isCompanySelect) {
      const now = new Date();
      newTitle = `${now.getMonth() + 1}月${now.getDate()}日の${val}のメモ`;
    }
    onChange({ ...data, title: newTitle });
  };

  const handleItemChange = (index, field, val) => {
    const newItems = [...data.items];
    newItems[index][field] = val;

    const lastItem = newItems[newItems.length - 1];
    const isLastEmpty =
      lastItem.question.trim() === "" && lastItem.answer.trim() === "";

    if (!isLastEmpty) {
      newItems.push({
        id: `item_${Date.now()}_${Math.random()}`,
        question: "",
        answer: "",
      });
    } else {
      while (
        newItems.length > 1 &&
        newItems[newItems.length - 1].question.trim() === "" &&
        newItems[newItems.length - 1].answer.trim() === "" &&
        newItems[newItems.length - 2].question.trim() === "" &&
        newItems[newItems.length - 2].answer.trim() === ""
      ) {
        newItems.pop();
      }
    }
    onChange({ ...data, items: newItems });
  };

  const handleSaveClick = (close = true) => {
    const validItems = data.items.filter(
      (item) => item.question.trim() !== "" || item.answer.trim() !== "",
    );
    const finalTitle = data.title.trim() || getTodayDateString();

    onSave({ title: finalTitle, items: validItems }, close);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`
        input::-webkit-calendar-picker-indicator {
          display: none !important;
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-lg border border-orange-200 overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/50 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
          <div className="flex-1 mr-4 relative">
            <input
              type="text"
              className={`w-full bg-transparent text-lg font-bold outline-none border-b border-transparent focus:border-orange-300 transition-colors ${
                data.title ? "text-slate-800" : "text-slate-400/70"
              }`}
              placeholder={getTodayDateString()}
              value={data.title}
              onChange={handleTitleChange}
              list="company-list-suggestions"
            />
            <datalist id="company-list-suggestions">
              {companyNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveClick(false)}
              className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-100 rounded-full transition-colors"
              title="保存"
            >
              <Save size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 min-h-[50vh]">
          {data.items.map((item, idx) => {
            const isLast = idx === data.items.length - 1;
            const isActive = activeItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveItemId(item.id)}
                className={`group transition-all duration-200 ${
                  isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex gap-3">
                  <div className="pt-3 shrink-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        isActive
                          ? "bg-orange-400"
                          : isLast
                            ? "bg-slate-200"
                            : "bg-orange-200"
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="w-full font-bold text-slate-700 placeholder-slate-300 bg-transparent outline-none border-b border-transparent focus:border-orange-300 transition-colors py-1"
                      placeholder="質問・項目"
                      value={item.question}
                      onChange={(e) =>
                        handleItemChange(idx, "question", e.target.value)
                      }
                      onFocus={() => setActiveItemId(item.id)}
                    />
                    <AutoResizeTextarea
                      value={item.answer}
                      onChange={(e) =>
                        handleItemChange(idx, "answer", e.target.value)
                      }
                      onFocus={() => setActiveItemId(item.id)}
                      placeholder="回答・内容..."
                      isActive={isActive}
                      writingStyle={writingStyle}
                      checkNgWords={checkNgWords}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={() => handleSaveClick(true)}
            className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-md font-bold text-sm flex items-center gap-2"
          >
            <Save size={16} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Default Data ---
const DEFAULT_FORM_DATA = {
  company: "",
  industry: "",
  myPageUrl: "",
  recruitmentUrl: "",
  status: "未提出",
  selectionType: "",
  deadline: "",
  note: "",
  qas: [{ id: 0, question: "", answer: "", tags: "", charLimit: "", note: "" }],
};

export default function App() {
  // --- State ---
  const [entries, setEntries] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [view, setView] = useState("list");
  const [viewMode, setViewMode] = useState("company");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoMode, setIsMemoMode] = useState(false);

  const [companyData, setCompanyData] = useState({});
  const [isCompanyDataEditOpen, setIsCompanyDataEditOpen] = useState(false);
  const [editingCompanyDataName, setEditingCompanyDataName] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load view settings", e);
      }
    }
    return [
      "company",
      "industry",
      "myPageUrl",
      "location",
      "selectionFlow",
      "idNumber",
      "action",
    ];
  });
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  const [isRefPanelOpen, setIsRefPanelOpen] = useState(false);

  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [initialFormState, setInitialFormState] = useState(null);

  const [draftFormData, setDraftFormData] = useState({ title: "", items: [] });
  const [initialDraftState, setInitialDraftState] = useState(null);

  const [appSettings, setAppSettings] = useState({
    autoSave: false,
    writingStyle: "",
    checkNgWords: true,
    showChecksInList: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const [activeQAId, setActiveQAId] = useState(null);

  const [toast, setToast] = useState(null);

  // --- Effects: Initialization & Auto Save ---
  useEffect(() => {
    const savedSettingsJson = localStorage.getItem(STORAGE_KEY_SETTINGS);
    let initialSettings = {
      autoSave: false,
      writingStyle: "",
      checkNgWords: true,
      showChecksInList: false,
    };

    if (savedSettingsJson) {
      try {
        initialSettings = {
          ...initialSettings,
          ...JSON.parse(savedSettingsJson),
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    setAppSettings(initialSettings);

    if (initialSettings.autoSave) {
      const savedDataJson = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedDataJson) {
        try {
          const parsed = JSON.parse(savedDataJson);

          let loadedEntries = [];
          if (parsed && Array.isArray(parsed.entries)) {
            loadedEntries = parsed.entries;
          }

          let loadedDrafts = [];
          if (parsed && Array.isArray(parsed.drafts)) {
            loadedDrafts = parsed.drafts;
          }

          let loadedCompanyData = {};
          if (parsed && parsed.companyUrls) {
            Object.entries(parsed.companyUrls).forEach(([name, val]) => {
              loadedCompanyData[name] = normalizeCompanyData(val);
            });
          } else if (parsed && parsed.companyData) {
            loadedCompanyData = parsed.companyData;
          }

          let hasMigration = false;
          const migratedEntries = loadedEntries.map((entry) => {
            if (entry.industry && entry.company) {
              const currentData =
                loadedCompanyData[entry.company] || normalizeCompanyData({});
              if (!currentData.industry) {
                currentData.industry = entry.industry;
                loadedCompanyData[entry.company] = currentData;
                hasMigration = true;
              }
              return { ...entry, industry: "" };
            }
            return entry;
          });

          setEntries(migratedEntries);
          setDrafts(loadedDrafts);
          setCompanyData(loadedCompanyData);
          if (hasMigration) {
            console.log("Migrated industry data to companyData");
          }
        } catch (e) {
          console.error("Failed to parse auto-saved data", e);
        }
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (appSettings.autoSave) {
      const dataToSave = {
        entries: entries,
        drafts: drafts,
        companyData: companyData,
        updatedAt: getCurrentJSTTime(),
      };
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem(STORAGE_KEY_DATA);
    }
  }, [entries, drafts, companyData, appSettings.autoSave, isInitialized]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_VIEW_SETTINGS,
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  // --- Effects: BeforeUnload ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (appSettings.autoSave) return;

      const hasEntries = entries.length > 0 || drafts.length > 0;
      let isFormDirty = false;

      if (view === "form" && !isMemoMode && initialFormState) {
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
  }, [
    view,
    entries,
    drafts,
    formData,
    initialFormState,
    appSettings.autoSave,
    isMemoMode,
  ]);

  useEffect(() => {
    if (viewMode === "drafts" && drafts.length === 0) {
      setViewMode("company");
    }
  }, [drafts, viewMode]);

  useEffect(() => {
    if (view === "form" && !isMemoMode && activeQAId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`qa-item-${activeQAId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, isMemoMode, activeQAId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        view === "form" &&
        !isMemoMode &&
        !isSettingsOpen &&
        !isCompanyDataEditOpen
      ) {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          if (formData.company) {
            handleSaveEntry(false);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    view,
    isMemoMode,
    isSettingsOpen,
    isCompanyDataEditOpen,
    formData,
    entries,
    companyData,
  ]);

  // --- Helpers & Memos ---
  const scrollToTop = (behavior = "auto") => {
    window.scrollTo({ top: 0, behavior: behavior });
  };

  const companyNames = useMemo(() => {
    const lastUpdateMap = new Map();
    entries.forEach((e) => {
      if (!e.company) return;
      const current = lastUpdateMap.get(e.company);
      const entryDate = new Date(e.updatedAt || 0);
      if (!current || entryDate > current) {
        lastUpdateMap.set(e.company, entryDate);
      }
    });

    const allNames = new Set(Object.keys(companyData));
    entries.forEach((e) => {
      if (e.company) allNames.add(e.company);
    });

    return Array.from(allNames).sort((a, b) => {
      const dateA = lastUpdateMap.get(a) || new Date(0);
      const dateB = lastUpdateMap.get(b) || new Date(0);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return a.localeCompare(b, "ja");
    });
  }, [entries, companyData]);

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
              `${entryBaseText} ${qa.question} ${qa.answer} ${qa.note} ${qaTags}`.toLowerCase();

            return terms.every((term) => combinedText.includes(term));
          });

          if (filteredQAs.length > 0) return { ...entry, qas: filteredQAs };
          return null;
        })
        .filter(Boolean);
    }

    return [...result].sort((a, b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const aHit = (a.company || "").toLowerCase().includes(q);
        const bHit = (b.company || "").toLowerCase().includes(q);
        if (aHit && !bHit) return -1;
        if (!aHit && bHit) return 1;

        if (aHit && bHit) {
          const aExact = (a.company || "").toLowerCase() === q;
          const bExact = (b.company || "").toLowerCase() === q;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
        }
      }

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
            qa.note,
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
              updatedAt: entry.updatedAt,
            });
          }
        });
      }
    });

    return allItems.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0);
      const dateB = new Date(b.updatedAt || 0);
      return dateB - dateA;
    });
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
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const aHit = a.toLowerCase().includes(q);
          const bHit = b.toLowerCase().includes(q);
          if (aHit && !bHit) return -1;
          if (!aHit && bHit) return 1;

          if (aHit && bHit) {
            if (a.toLowerCase() === q && b.toLowerCase() !== q) return -1;
            if (b.toLowerCase() === q && a.toLowerCase() !== q) return 1;
          }
        }

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
  const handleSaveCompanyData = (newCompanyName, newData, oldCompanyName) => {
    if (newCompanyName !== oldCompanyName && companyData[newCompanyName]) {
      alert(`企業名『${newCompanyName}』のデータは既に存在します。`);
      return;
    }

    setCompanyData((prev) => {
      const next = { ...prev };

      if (oldCompanyName && oldCompanyName !== newCompanyName) {
        delete next[oldCompanyName];
      }

      next[newCompanyName] = newData;
      return next;
    });

    if (oldCompanyName && oldCompanyName !== newCompanyName) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.company === oldCompanyName
            ? { ...entry, company: newCompanyName }
            : entry,
        ),
      );
    }
  };

  const handleSettingsSave = (newSettings) => {
    setAppSettings(newSettings);
  };

  const resetForm = (behavior = "auto") => {
    setView("list");
    setEditingId(null);
    setIsMemoMode(false);
    const newState = { ...DEFAULT_FORM_DATA };
    setFormData(newState);
    setInitialFormState(null);
    setActiveQAId(null);
    setIsRefPanelOpen(false);
    scrollToTop(behavior);
  };

  const handleCancel = (arg) => {
    const behavior = typeof arg === "string" ? arg : "auto";
    if (isMemoMode) {
      let isDirty = false;
      if (initialDraftState) {
        const currentJson = JSON.stringify(draftFormData);
        const initialJson = JSON.stringify(initialDraftState);
        isDirty = currentJson !== initialJson;
      }

      if (isDirty) {
        const isConfirmed = window.confirm(
          "編集中のメモは保存されていません。\n一覧画面に戻るとデータは失われますが、よろしいですか?",
        );
        if (!isConfirmed) return;
      }
      resetForm(behavior);
      return;
    }

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
          "編集中のデータは保存されていません。\n一覧画面に戻るとデータは失われますが、よろしいですか?",
        );
        if (!isConfirmed) return;
      }
      resetForm(behavior);
    } else {
      resetForm(behavior);
    }
  };

  // --- Handler: Save Draft ---
  const handleSaveDraft = (draftData, close = true) => {
    const now = getCurrentJSTTime();
    const currentId =
      editingId ||
      `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newDraft = {
      id: currentId,
      title: draftData.title,
      items: draftData.items,
      updatedAt: now,
    };

    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === currentId);
      if (exists) {
        return prev.map((d) => (d.id === currentId ? newDraft : d));
      } else {
        return [newDraft, ...prev];
      }
    });

    setToast("メモを保存しました");
    setTimeout(() => setToast(null), 3000);

    if (close) {
      setViewMode("drafts");
      resetForm();
    } else {
      if (!editingId) {
        setEditingId(currentId);
      }
      const nextFormState = {
        ...draftFormData,
        title: draftData.title,
      };
      setDraftFormData(nextFormState);
      setInitialDraftState(JSON.parse(JSON.stringify(nextFormState)));
    }
  };

  // --- Handler: Save Entry ---
  const handleSaveEntry = (closeAfterSave = true) => {
    const newCompany = formData.company?.trim();
    if (!newCompany) return;

    try {
      const oldCompany = initialFormState?.company;
      const isRenaming = oldCompany && oldCompany !== newCompany;
      let shouldDeleteOldData = false;

      if (isRenaming) {
        const targetExists =
          companyData[newCompany] ||
          entries.some((e) => e.company === newCompany);

        const oldEntriesCount = entries.filter(
          (e) => e.company === oldCompany,
        ).length;

        const isLastEntry = oldEntriesCount <= 1;

        if (targetExists) {
          let msg = `企業名『${newCompany}』は既に存在します。\nこのエントリーを『${newCompany}』に移動・統合しますか?`;
          if (isLastEntry) {
            msg += `\n(旧企業名『${oldCompany}』のデータは削除されます)`;
          }
          if (!window.confirm(msg)) return;
        }

        if (isLastEntry) {
          shouldDeleteOldData = true;
        }
      }

      let nextCompanyDataObj = {};
      if (companyData[newCompany]) {
        nextCompanyDataObj = { ...companyData[newCompany] };
      } else if (isRenaming && companyData[oldCompany]) {
        nextCompanyDataObj = { ...companyData[oldCompany] };
      } else {
        nextCompanyDataObj = normalizeCompanyData({});
      }

      if (formData.myPageUrl) nextCompanyDataObj.myPageUrl = formData.myPageUrl;
      if (formData.recruitmentUrl)
        nextCompanyDataObj.recruitmentUrl = formData.recruitmentUrl;
      if (formData.industry) nextCompanyDataObj.industry = formData.industry;

      const currentId =
        editingId ||
        (formData.id && formData.id.toString().startsWith("entry_")
          ? formData.id
          : `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

      const entryData = {
        ...formData,
        id: currentId,
        company: newCompany,
        updatedAt: getCurrentJSTTime(),
      };
      const sanitized = sanitizeEntry(entryData);

      setEntries((prevEntries) => {
        const exists = prevEntries.some((e) => e.id === currentId);
        if (exists) {
          return prevEntries.map((e) => (e.id === currentId ? sanitized : e));
        } else {
          return [sanitized, ...prevEntries];
        }
      });

      setCompanyData((prevData) => {
        const nextData = { ...prevData };
        nextData[newCompany] = nextCompanyDataObj;

        if (shouldDeleteOldData && oldCompany) {
          delete nextData[oldCompany];
        }
        return nextData;
      });

      if (closeAfterSave) {
        resetForm();
      } else {
        setEditingId(currentId);
        const newFormState = { ...entryData };
        setFormData(newFormState);
        setInitialFormState(JSON.parse(JSON.stringify(newFormState)));

        setToast("保存しました");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました。");
    }
  };

  const handleDelete = (id) => {
    const isDraft = id.toString().startsWith("draft_");
    if (isDraft) {
      if (!confirm("このメモを削除しますか?\n(この操作は取り消せません。)"))
        return;
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (isMemoMode) resetForm();
    } else {
      if (
        !confirm(
          "この企業のエントリーシートを削除しますか?\n(企業データは残ります)",
        )
      )
        return;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleDeleteCompanyData = (companyName) => {
    if (
      confirm(
        `${companyName}のデータを削除しますか?\n(この操作は取り消せません。)`,
      )
    ) {
      setCompanyData((prev) => {
        const next = { ...prev };
        delete next[companyName];
        return next;
      });
    }
  };

  const startEdit = (entry, qaId = null) => {
    const isDraft = entry.id.toString().startsWith("draft_");
    setEditingId(entry.id);
    setView("form");
    setIsMemoMode(isDraft);

    if (isDraft) {
      const draft = drafts.find((d) => d.id === entry.id);
      if (draft) {
        const loadedItems = draft.items ? [...draft.items] : [];
        const lastItem = loadedItems[loadedItems.length - 1];
        if (
          !lastItem ||
          lastItem.question.trim() !== "" ||
          lastItem.answer.trim() !== ""
        ) {
          loadedItems.push({
            id: `item_${Date.now()}`,
            question: "",
            answer: "",
          });
        }

        const editState = { title: draft.title, items: loadedItems };
        setDraftFormData(editState);
        setInitialDraftState(JSON.parse(JSON.stringify(editState)));
      }
    } else {
      const fullEntry = entries.find((e) => e.id === entry.id) || entry;
      const cData = companyData[fullEntry.company] || normalizeCompanyData({});
      const editState = {
        company: fullEntry.company,
        industry: cData.industry || "",
        status: fullEntry.status || "未提出",
        selectionType: fullEntry.selectionType || "",
        deadline: fullEntry.deadline || "",
        note: fullEntry.note || "",
        myPageUrl: cData.myPageUrl || "",
        recruitmentUrl: cData.recruitmentUrl || "",
        createdAt: fullEntry.createdAt,
        qas: fullEntry.qas
          ? fullEntry.qas.map((q) => ({
              ...q,
              tags: Array.isArray(q.tags) ? q.tags.join(", ") : q.tags || "",
              note: q.note || "",
            }))
          : [],
      };

      setFormData(editState);
      setInitialFormState(JSON.parse(JSON.stringify(editState)));
      if (qaId) {
        setActiveQAId(qaId);
      } else {
        if (editState.qas.length > 0) {
          setActiveQAId(editState.qas[0].id);
        }
        scrollToTop();
      }
    }
    scrollToTop();
  };

  const handleEditById = (entryId, qaId = null) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) startEdit(entry, qaId);
  };

  const startNewEntry = () => {
    resetForm();
    setIsMemoMode(false);
    const newId = Date.now();
    const newState = {
      ...DEFAULT_FORM_DATA,
      qas: [
        {
          id: newId,
          question: "",
          answer: "",
          tags: "",
          charLimit: "",
          note: "",
        },
      ],
    };
    setFormData(newState);
    setInitialFormState(JSON.parse(JSON.stringify(newState)));
    setActiveQAId(newId);
    setView("form");
    scrollToTop();
  };

  const startNewMemo = () => {
    resetForm();
    setIsMemoMode(true);
    setEditingId(null);

    const initial = {
      title: "",
      items: [{ id: `item_${Date.now()}`, question: "", answer: "" }],
    };
    setDraftFormData(initial);
    setInitialDraftState(JSON.parse(JSON.stringify(initial)));

    setView("form");
    scrollToTop();
  };

  // --- Handlers: File IO ---
  const handleExport = () => {
    const exportData = {
      entries: entries,
      drafts: drafts,
      companyData: companyData,
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
        let draftsToLoad = [];
        let dataToLoad = {};

        if (Array.isArray(importedJson)) {
          entriesToLoad = importedJson;
        } else if (importedJson && Array.isArray(importedJson.entries)) {
          entriesToLoad = importedJson.entries;
          if (importedJson.drafts) draftsToLoad = importedJson.drafts;

          if (importedJson.companyData) {
            dataToLoad = importedJson.companyData;
          } else if (importedJson.companyUrls) {
            Object.entries(importedJson.companyUrls).forEach(([name, val]) => {
              dataToLoad[name] = normalizeCompanyData(val);
            });
          }
        } else {
          alert(
            "無効なファイル形式です。es-data形式のJSONファイルを選択してください。",
          );
          return;
        }

        if (
          confirm(
            "現在のデータを破棄して、ファイルを読み込みますか?\n(未保存のデータは失われます)",
          )
        ) {
          let migratedData = { ...dataToLoad };
          const normalizedData = entriesToLoad.map((item) => {
            if (item.company) {
              const currentData =
                migratedData[item.company] || normalizeCompanyData({});
              let updated = false;
              if (item.myPageUrl && !currentData.myPageUrl) {
                currentData.myPageUrl = item.myPageUrl;
                updated = true;
              }
              if (item.industry && !currentData.industry) {
                currentData.industry = item.industry;
                updated = true;
              }
              if (updated) {
                migratedData[item.company] = currentData;
              }
            }
            return sanitizeEntry({ ...item, industry: "" });
          });

          setEntries(normalizedData);
          setDrafts(draftsToLoad);
          setCompanyData((prev) => ({ ...prev, ...migratedData }));
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
  const addQA = () => {
    const newId = Date.now();
    setFormData((p) => ({
      ...p,
      qas: [
        ...p.qas,
        {
          id: newId,
          question: "",
          answer: "",
          tags: "",
          charLimit: "",
          note: "",
        },
      ],
    }));
    setActiveQAId(newId);
  };

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
    if (formData.qas.length > 1) {
      if (
        window.confirm("この質問を削除しますか? (この操作は取り消せません。)")
      ) {
        setFormData((p) => ({ ...p, qas: p.qas.filter((q) => q.id !== id) }));
      }
    }
  };

  const updateQA = (id, f, v) =>
    setFormData((p) => ({
      ...p,
      qas: p.qas.map((q) => (q.id === id ? { ...q, [f]: v } : q)),
    }));

  // --- Company Data Calculation ---
  const companyDataList = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (e.company) set.add(e.company);
    });
    Object.keys(companyData).forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [entries, companyData]);

  const openCompanyEdit = (company) => {
    setEditingCompanyDataName(company);
    setIsCompanyDataEditOpen(true);
  };

  const toggleColumn = (columnId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((id) => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // --- Render ---
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col"
      onClick={() => setActiveQAId(null)}
    >
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleCancel(view === "list" ? "smooth" : "auto")}
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
            {view === "form" && !isMemoMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRefPanelOpen((prev) => !prev);
                }}
                className={`sm:hidden p-2 rounded-lg transition-colors ${
                  isRefPanelOpen
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <PanelRight size={20} />
              </button>
            )}
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
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-white text-slate-600 border border-slate-200 p-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  title="設定"
                >
                  <Settings size={18} />
                </button>
              </div>

              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  onClick={startNewMemo}
                  title="メモ作成"
                  className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg sm:px-4 flex items-center gap-1.5 shadow-md transition-all active:scale-95 ml-2 shrink-0"
                >
                  <StickyNote size={18} />
                  <span className="hidden md:inline font-medium">メモ作成</span>
                </button>

                <button
                  onClick={startNewEntry}
                  title="新規作成"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg sm:px-4 flex items-center gap-1.5 shadow-md transition-all active:scale-95 ml-1 shrink-0"
                >
                  <Plus size={18} />
                  <span className="hidden md:inline font-medium">新規作成</span>
                </button>
              </div>
            </div>
          )}

          {view !== "list" && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {view === "form" && !isMemoMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRefPanelOpen((prev) => !prev);
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                    isRefPanelOpen
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <PanelRight size={16} />
                  {isRefPanelOpen ? "参照パネルを閉じる" : "過去ESを参照"}
                </button>
              )}
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
          <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1 items-center">
            {drafts.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setViewMode("drafts");
                    scrollToTop("smooth");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                    viewMode === "drafts"
                      ? "bg-orange-500 text-white shadow-sm border-orange-600"
                      : "bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
                  }`}
                >
                  <StickyNote size={14} />
                  メモ
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1 shrink-0"></div>
              </>
            )}

            {[
              { id: "company", icon: Building2, label: "会社別" },
              { id: "status", icon: Check, label: "ステータス別" },
              { id: "question", icon: LayoutList, label: "質問別" },
              { id: "tag", icon: Tags, label: "タグ別" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setViewMode(mode.id);
                  scrollToTop("smooth");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                  viewMode === mode.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <mode.icon size={14} />
                {mode.label}
              </button>
            ))}

            <div className="w-px h-6 bg-slate-300 mx-1 shrink-0"></div>

            <button
              onClick={() => {
                setViewMode("company_data");
                scrollToTop("smooth");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                viewMode === "company_data"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Database size={14} />
              企業データ
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        <main
          className={`flex-1 overflow-y-auto p-4 sm:p-6 transition-all duration-300 ease-in-out ${
            isRefPanelOpen && !isMemoMode ? "mr-0 lg:mr-96" : "mr-0"
          }`}
        >
          <div className="max-w-5xl mx-auto pb-20">
            {view === "list" ? (
              <div className="space-y-8">
                {/* View: Drafts List */}
                {viewMode === "drafts" && drafts.length > 0 && (
                  <div className="space-y-6">
                    {drafts.map((draft) => (
                      <DraftDisplay
                        key={draft.id}
                        draft={draft}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        highlight={searchQuery}
                        appSettings={appSettings}
                      />
                    ))}
                  </div>
                )}

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
                    {processedCompanyEntries.map((entry) => {
                      const cData = companyData[entry.company] || {};
                      return (
                        <ESEntryDisplay
                          key={entry.id}
                          entry={{ ...entry, industry: cData.industry }}
                          onEdit={startEdit}
                          onDelete={handleDelete}
                          companyUrl={cData.myPageUrl}
                          highlight={searchQuery}
                          appSettings={appSettings}
                        />
                      );
                    })}
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
                        appSettings={appSettings}
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
                              appSettings={appSettings}
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
                              {entries.map((entry) => {
                                const cData = companyData[entry.company] || {};
                                return (
                                  <ESEntryDisplay
                                    key={entry.id}
                                    entry={{
                                      ...entry,
                                      industry: cData.industry,
                                    }}
                                    onEdit={startEdit}
                                    onDelete={handleDelete}
                                    companyUrl={cData.myPageUrl}
                                    highlight={searchQuery}
                                    appSettings={appSettings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      },
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
                          ].includes(s),
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
                            {entriesByStatus[status].map((entry) => {
                              const cData = companyData[entry.company] || {};
                              return (
                                <ESEntryDisplay
                                  key={entry.id}
                                  entry={{ ...entry, industry: cData.industry }}
                                  onEdit={startEdit}
                                  onDelete={handleDelete}
                                  companyUrl={cData.myPageUrl}
                                  appSettings={appSettings}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* View: Company Data */}
                {viewMode === "company_data" && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                          <Database size={18} className="text-indigo-600" />
                          企業データ一覧
                        </h3>
                        <span className="text-xs text-slate-500">
                          {companyDataList.length}社
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCompanyDataName(null);
                            setIsCompanyDataEditOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
                        >
                          <Plus size={14} />{" "}
                          <span className="hidden sm:inline">新規作成</span>
                        </button>

                        <button
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
                            isEditMode
                              ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Edit2 size={14} />
                          <span className="hidden sm:inline">
                            {isEditMode ? "編集を終了" : "編集"}
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setIsColumnSelectorOpen(!isColumnSelectorOpen)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                          <Columns size={14} />{" "}
                          <span className="hidden sm:inline">表示項目設定</span>
                        </button>

                        {isColumnSelectorOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsColumnSelectorOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                              <div className="text-xs font-bold text-slate-500 px-2 py-1 mb-1 border-b border-slate-100">
                                表示する項目を選択
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-1">
                                {COMPANY_DATA_COLUMNS.filter(
                                  (col) => col.id !== "company",
                                ).map((col) => (
                                  <label
                                    key={col.id}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={visibleColumns.includes(col.id)}
                                      onChange={() => toggleColumn(col.id)}
                                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    />
                                    <span className="text-xs text-slate-700">
                                      {col.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-2">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                          <tr>
                            {COMPANY_DATA_COLUMNS.map((col) => {
                              if (!visibleColumns.includes(col.id)) return null;
                              return (
                                <th
                                  key={col.id}
                                  className={`px-6 py-3 font-bold whitespace-nowrap ${
                                    col.id === "company"
                                      ? "sticky left-0 z-20 bg-slate-50 border-r border-slate-200"
                                      : ""
                                  }`}
                                  style={{ minWidth: col.minWidth }}
                                >
                                  {col.label}
                                </th>
                              );
                            })}
                            {isEditMode && (
                              <th className="px-6 py-3 font-bold text-right sticky right-0 bg-slate-50/95 backdrop-blur-sm border-l border-slate-100 z-10 shadow-sm w-[130px]">
                                操作
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {companyDataList.length === 0 && (
                            <tr>
                              <td
                                colSpan={
                                  visibleColumns.length + (isEditMode ? 1 : 0)
                                }
                                className="px-6 py-8 text-center text-slate-400"
                              >
                                データがありません
                              </td>
                            </tr>
                          )}
                          {companyDataList.map((company) => {
                            const data =
                              companyData[company] || normalizeCompanyData({});
                            return (
                              <tr
                                key={company}
                                className="bg-white hover:bg-slate-50 transition-colors group"
                              >
                                {COMPANY_DATA_COLUMNS.map((col) => {
                                  if (!visibleColumns.includes(col.id))
                                    return null;

                                  let content = null;
                                  if (col.id === "company") {
                                    content = (
                                      <HighlightText
                                        text={company}
                                        highlight={searchQuery}
                                      />
                                    );
                                  } else if (col.id === "myPageUrl") {
                                    content = data.myPageUrl ? (
                                      <a
                                        href={data.myPageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 w-fit"
                                      >
                                        <ExternalLink size={14} />
                                        <span className="truncate max-w-[180px]">
                                          {data.myPageUrl}
                                        </span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    );
                                  } else if (col.id === "recruitmentUrl") {
                                    content = data.recruitmentUrl ? (
                                      <a
                                        href={data.recruitmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 w-fit"
                                      >
                                        <ExternalLink size={14} />
                                        <span className="truncate max-w-[180px]">
                                          {data.recruitmentUrl}
                                        </span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    );
                                  } else if (col.id === "location") {
                                    content = data.location ? (
                                      <div
                                        className="truncate max-w-[150px]"
                                        title={data.location}
                                      >
                                        {data.location}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    );
                                  } else if (col.id === "selectionFlow") {
                                    content =
                                      data.selectionFlow?.length > 0 ? (
                                        <span
                                          className="block whitespace-pre-wrap leading-relaxed"
                                          title={data.selectionFlow.join(" → ")}
                                        >
                                          {data.selectionFlow.join(" → ")}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">
                                          -
                                        </span>
                                      );
                                  } else {
                                    content = data[col.id] || (
                                      <span className="text-slate-400">-</span>
                                    );
                                  }

                                  return (
                                    <td
                                      key={col.id}
                                      className={`px-6 py-4 ${
                                        col.id === "company"
                                          ? "font-bold text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {content}
                                    </td>
                                  );
                                })}
                                {isEditMode && (
                                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 z-10 shadow-sm whitespace-nowrap">
                                    <button
                                      onClick={() => openCompanyEdit(company)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors whitespace-nowrap"
                                    >
                                      編集
                                    </button>
                                    {(() => {
                                      const hasEntries = entries.some(
                                        (e) => e.company === company,
                                      );
                                      return (
                                        <button
                                          onClick={() =>
                                            handleDeleteCompanyData(company)
                                          }
                                          disabled={hasEntries}
                                          title={
                                            hasEntries
                                              ? "ESが存在しています"
                                              : ""
                                          }
                                          className={`ml-2 px-3 py-1.5 bg-white border rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                            hasEntries
                                              ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                              : "text-rose-500 border-slate-200 hover:bg-rose-50 hover:border-rose-200"
                                          }`}
                                        >
                                          削除
                                        </button>
                                      );
                                    })()}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : // --- Edit Form ---
            isMemoMode ? (
              <DraftEditor
                data={draftFormData}
                onChange={setDraftFormData}
                onSave={handleSaveDraft}
                onCancel={handleCancel}
                companyNames={companyNames}
                writingStyle={appSettings.writingStyle}
                checkNgWords={appSettings.checkNgWords}
              />
            ) : (
              // --- Standard Entry Editor Mode ---
              <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">
                      {editingId ? "編集" : "新規登録"}
                    </h2>
                    <button
                      onClick={() => handleSaveEntry(false)}
                      disabled={!formData.company}
                      title="保存"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Save size={20} />
                    </button>
                  </div>
                  <div
                    className="p-6 space-y-4"
                    onClick={() => setActiveQAId(null)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <label className="text-xs font-bold text-slate-500">
                          企業名 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <input
                            className="w-full pl-3 pr-16 py-2 border rounded-lg outline-none focus:border-indigo-500"
                            value={formData.company}
                            onChange={(e) => {
                              const newCompany = e.target.value;
                              const cData =
                                companyData[newCompany] ||
                                normalizeCompanyData({});
                              setFormData({
                                ...formData,
                                company: newCompany,
                                myPageUrl: cData.myPageUrl || "",
                                recruitmentUrl: cData.recruitmentUrl || "",
                                industry: formData.industry || cData.industry,
                              });
                            }}
                            placeholder="例: 株式会社Tech"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                            {formData.recruitmentUrl && (
                              <a
                                href={formData.recruitmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="採用HPを開く"
                                tabIndex="-1"
                              >
                                <Briefcase size={16} />
                              </a>
                            )}
                            {formData.myPageUrl && (
                              <a
                                href={formData.myPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="マイページを開く"
                                tabIndex="-1"
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {!editingId && (
                        <>
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
                                setFormData({
                                  ...formData,
                                  industry: e.target.value,
                                })
                              }
                              placeholder="例: IT、エンジニア"
                            />
                          </div>
                        </>
                      )}

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
                            ),
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
                            setFormData({
                              ...formData,
                              deadline: e.target.value,
                            })
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
                        {formData.qas.map((qa, idx) => {
                          const isActive = activeQAId === qa.id;

                          return (
                            <div
                              key={qa.id}
                              id={`qa-item-${qa.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQAId(qa.id);
                              }}
                              className={`rounded-xl border transition-all duration-300 ease-in-out px-4 pt-2 pb-3 ${
                                isActive
                                  ? "bg-slate-50 shadow-sm border-indigo-200 ring-1 ring-indigo-200"
                                  : "bg-white border-slate-200 hover:border-indigo-300 cursor-pointer opacity-90 hover:opacity-100"
                              }`}
                            >
                              <div className="relative z-10 flex items-center justify-between min-h-[32px] pointer-events-none">
                                <div
                                  className={`text-xs font-bold transition-colors duration-300 shrink-0 ${
                                    isActive
                                      ? "text-indigo-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  Q{idx + 1}
                                </div>

                                <div
                                  className={`flex items-center gap-3 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 ml-auto pointer-events-auto ${
                                    isActive
                                      ? "max-w-[400px] opacity-100 translate-x-0"
                                      : "max-w-0 opacity-0 translate-x-4"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 min-w-max">
                                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                                      文字数:
                                    </span>
                                    <input
                                      type="text"
                                      className="w-16 text-right text-xs bg-white border border-slate-200 rounded px-1 py-0.5 focus:border-indigo-500 outline-none placeholder-slate-300"
                                      placeholder="なし"
                                      value={qa.charLimit || ""}
                                      onChange={(e) =>
                                        updateQA(
                                          qa.id,
                                          "charLimit",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="flex items-center gap-1 min-w-max">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveQA(idx, "up");
                                      }}
                                      disabled={idx === 0}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                      title="質問を上に移動"
                                    >
                                      <ArrowUp size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveQA(idx, "down");
                                      }}
                                      disabled={idx === formData.qas.length - 1}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                      title="質問を下に移動"
                                    >
                                      <ArrowDown size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeQA(qa.id);
                                      }}
                                      title="質問を削除"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`transition-all duration-300 ease-in-out ${
                                  isActive ? "mt-0" : "-mt-9.5"
                                }`}
                              >
                                <div className="pt-2 pb-1">
                                  <input
                                    className={`w-full bg-transparent outline-none transition-all duration-300 ease-in-out ${
                                      isActive
                                        ? "font-bold text-slate-800 placeholder-slate-300 border-b border-indigo-300 text-base py-2 pl-0"
                                        : "font-bold text-slate-700 placeholder-slate-300 border-b border-transparent text-sm py-1 pl-8 truncate"
                                    }`}
                                    placeholder="質問内容"
                                    value={qa.question}
                                    onFocus={() => setActiveQAId(qa.id)}
                                    onChange={(e) =>
                                      updateQA(
                                        qa.id,
                                        "question",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div
                                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                                  isActive
                                    ? "grid-rows-[1fr]"
                                    : "grid-rows-[0fr]"
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="mb-3 pt-1">
                                    <input
                                      className="w-full text-xs px-3 py-2 bg-slate-50/50 border rounded-md outline-none placeholder-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
                                      placeholder="補足事項や前提条件"
                                      value={qa.note || ""}
                                      onFocus={() => setActiveQAId(qa.id)}
                                      onChange={(e) =>
                                        updateQA(qa.id, "note", e.target.value)
                                      }
                                      tabIndex={isActive ? 0 : -1}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mb-1">
                                <AutoResizeTextarea
                                  value={qa.answer}
                                  onChange={(e) =>
                                    updateQA(qa.id, "answer", e.target.value)
                                  }
                                  onFocus={() => setActiveQAId(qa.id)}
                                  placeholder="回答..."
                                  isActive={isActive}
                                  charLimit={qa.charLimit}
                                  writingStyle={appSettings.writingStyle}
                                  checkNgWords={appSettings.checkNgWords}
                                />
                                <div
                                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                                    isActive
                                      ? "grid-rows-[1fr] opacity-100"
                                      : "grid-rows-[0fr] opacity-0"
                                  }`}
                                >
                                  <div className="overflow-hidden">
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
                                      note={qa.note}
                                      onApply={(text) =>
                                        updateQA(qa.id, "answer", text)
                                      }
                                      allEntries={entries}
                                      entryId={editingId}
                                      qaId={qa.id}
                                    />
                                  </div>
                                </div>
                              </div>

                              {isActive ? (
                                <input
                                  className="mt-2 w-full text-xs px-3 py-2 bg-white border rounded-md outline-none focus:border-indigo-500 animate-in fade-in slide-in-from-top-1 duration-200"
                                  placeholder="タグ (例: 自己PR、ガクチカ)"
                                  value={qa.tags}
                                  onFocus={() => setActiveQAId(qa.id)}
                                  onChange={(e) =>
                                    updateQA(qa.id, "tags", e.target.value)
                                  }
                                />
                              ) : (
                                <div className="flex justify-between items-center gap-2 mt-3 animate-in fade-in duration-300">
                                  <input
                                    className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded outline-none focus:border-indigo-500 transition-all placeholder-slate-300"
                                    placeholder="タグ"
                                    value={qa.tags}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      updateQA(qa.id, "tags", e.target.value)
                                    }
                                  />
                                  <div
                                    className={`text-right text-[10px] font-mono shrink-0 ${
                                      qa.charLimit &&
                                      qa.answer.length > Number(qa.charLimit)
                                        ? "text-rose-500 font-bold"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {qa.answer.length}文字
                                    {qa.charLimit && ` / 上限: ${qa.charLimit}`}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addQA();
                        }}
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
                        onClick={() => handleSaveEntry(true)}
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
          </div>
        </main>

        <ReferenceSidebar
          isOpen={isRefPanelOpen}
          onClose={() => setIsRefPanelOpen(false)}
          entries={entries}
          editingId={editingId}
          appSettings={appSettings}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={appSettings}
        onSettingsSave={handleSettingsSave}
      />

      <CompanyDataEditModal
        isOpen={isCompanyDataEditOpen}
        onClose={() => setIsCompanyDataEditOpen(false)}
        companyName={editingCompanyDataName}
        initialData={
          editingCompanyDataName ? companyData[editingCompanyDataName] : {}
        }
        onSave={handleSaveCompanyData}
        existingCompanies={companyDataList}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
