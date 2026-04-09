import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
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
  ChevronUp,
  ChevronDown,
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
  MessageSquareCode,
  BarChart3,
  Target,
  PenTool,
  Zap,
  CheckCircle2,
  Activity,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector,
  ScatterChart,
  Scatter,
} from "recharts";

// --- Constants ---
const STORAGE_KEY_SETTINGS = "ES_MANAGER_SETTINGS";
const STORAGE_KEY_DATA = "ES_MANAGER_DATA";
const STORAGE_KEY_VIEW_SETTINGS = "ES_MANAGER_VIEW_SETTINGS";
const STORAGE_KEY_ACTIVITY_LOG = "ES_MANAGER_ACTIVITY_LOG";
const STORAGE_KEY_TUTORIAL = "ES_MANAGER_TUTORIAL";
const HEADER_HEIGHT = "57px";

const DEFAULT_TUTORIAL_STATE = {
  hasSeenWelcome: false,
  hasClickedNewEntry: false,
  hasSeenFormTutorial: false,
  hasCreatedFirstData: false,
  hasSeenFeatureUnlockTooltip: false,
  hasSeenCompanyDataTutorial: false,
  hasCreatedFirstMemo: false,
  hasSeenMemoTooltip: false,
};

const COMPLETED_STATUSES = ["提出済", "採用", "不採用"];

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
  { id: "idNumber", label: "マイページID番号", minWidth: "100px" },
  { id: "note", label: "備考", minWidth: "200px" },
];

// --- Statistics Constants & Utils ---
const CHART_COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  neutral: "#64748b",
  text: "#1e293b",
  grid: "#f1f5f9",
};

const ANALYTICS_STATUS_GROUPS = {
  success: ["採用"],
  failure: ["不採用"],
  pending: ["未提出", "作成中"],
  completed: ["提出済", "採用", "不採用"],
};

const parseSalary = (value) => {
  if (!value) return null;
  let normalized = value.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0),
  );

  normalized = normalized.replace(/,/g, "");

  let num = null;
  if (normalized.includes("~") || normalized.includes("〜")) {
    const parts = normalized
      .split(/[~〜]/)
      .map((s) => parseFloat(s.replace(/[^0-9.]/g, "")))
      .filter((n) => !isNaN(n));
    if (parts.length === 2) {
      num = (parts[0] + parts[1]) / 2;
    } else if (parts.length === 1) {
      num = parts[0];
    }
  } else {
    const match = normalized.match(/[0-9.]+/);
    if (match) num = parseFloat(match[0]);
  }

  if (num === null) return null;

  return num <= 10000 ? num * 10000 : num;
};

// --- Utilities ---
const getSafariUrl = (url) => {
  if (!url) return url;
  const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isPWA =
    window.navigator.standalone ||
    window.matchMedia("(display-mode: standalone)").matches;

  if (isIOS && isPWA) {
    return url
      .replace(/^https:\/\//i, "x-safari-https://")
      .replace(/^http:\/\//i, "x-safari-http://");
  }
  return url;
};

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

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const migrateActivityLog = (raw) => {
  if (!raw || typeof raw !== "object") return {};

  const sampleVal = Object.values(raw)[0];
  if (typeof sampleVal === "number") {
    const next = {};
    Object.entries(raw).forEach(([date, count]) => {
      next[date] = { total: Number(count) || 0, hourly: {} };
    });
    return next;
  }

  const next = {};
  Object.entries(raw).forEach(([date, value]) => {
    if (!value || typeof value !== "object") {
      next[date] = { total: Number(value) || 0, hourly: {} };
      return;
    }
    const hourly = value.hourly || {};
    const total =
      typeof value.total === "number"
        ? value.total
        : Object.values(hourly).reduce((a, b) => a + Number(b || 0), 0) || 0;
    next[date] = { total: Number(total) || 0, hourly: { ...hourly } };
  });
  return next;
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

  const completedStatuses = new Set(COMPLETED_STATUSES);
  const completedAtValue = entry.completedAt
    ? entry.completedAt
    : completedStatuses.has(entry.status)
      ? entry.updatedAt || now
      : null;

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
    completedAt: completedAtValue,
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
  "gemini-3.1-pro-preview", // 最新かつ無料利用不可

  "gemini-3-flash-preview",

  "gemini-2.5-pro", // 無料利用不可かつ非推奨~6/17
  "gemini-2.5-flash", // 非推奨~6/17
  "gemini-2.5-flash-lite", // 非推奨~7/22
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

const HighlightText = ({
  text,
  highlight,
  writingStyle,
  checkNgWords,
  isTag,
}) => {
  if (!text) return <>{text}</>;

  const textStr = text.toString();

  const searchTerms = highlight
    ? highlight
        .toLowerCase()
        .replace(/＃/g, "#")
        .split(/[\s\u3000]+/)
        .filter((t) => t.length > 0 && !t.startsWith("-"))
        .filter((t) => (isTag ? true : !t.startsWith("#")))
        .map((t) => (t.startsWith("#") ? t.slice(1) : t))
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
    return <>{textStr}</>;
  }

  const styles = Array(textStr.length).fill(null);

  checkPatterns.forEach(({ regex, color }) => {
    const r = new RegExp(
      regex.source,
      regex.flags.includes("g") ? regex.flags : regex.flags + "g",
    );
    let match;
    while ((match = r.exec(textStr)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      for (let i = start; i < end; i++) {
        if (!styles[i]) {
          styles[i] = color;
        }
      }
      if (match.index === r.lastIndex) r.lastIndex++;
    }
  });

  if (searchTerms.length > 0) {
    const searchRegexSource = `(${searchTerms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`;
    const searchRegex = new RegExp(searchRegexSource, "gi");
    let match;
    while ((match = searchRegex.exec(textStr)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      for (let i = start; i < end; i++) {
        styles[i] = "bg-yellow-200 text-slate-900";
      }
      if (match.index === searchRegex.lastIndex) searchRegex.lastIndex++;
    }
  }

  const result = [];
  let currentStyle = styles[0];
  let currentStr = textStr[0];

  for (let i = 1; i < textStr.length; i++) {
    if (styles[i] === currentStyle) {
      currentStr += textStr[i];
    } else {
      if (currentStyle) {
        result.push(
          <span
            key={i}
            className={`${currentStyle} rounded-sm box-decoration-clone`}
          >
            {currentStr}
          </span>,
        );
      } else {
        result.push(<span key={i}>{currentStr}</span>);
      }
      currentStyle = styles[i];
      currentStr = textStr[i];
    }
  }

  if (currentStyle) {
    result.push(
      <span
        key="last"
        className={`${currentStyle} rounded-sm box-decoration-clone`}
      >
        {currentStr}
      </span>,
    );
  } else {
    result.push(<span key="last">{currentStr}</span>);
  }

  return <>{result}</>;
};

// --- Statistics Components ---
const StatCard = ({ icon: Icon, label, value, subValue, colorClass }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 h-full">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass.bg} ${colorClass.text}`}
    >
      <Icon size={24} />
    </div>
    <div className="min-w-0 flex-1 flex flex-col justify-center">
      <p className="text-xs font-bold text-slate-400 mb-0.5 truncate">
        {label}
      </p>
      <div className="flex flex-col items-start leading-none">
        <h3 className="text-2xl font-black text-slate-700 mb-1">{value}</h3>
        {subValue && (
          <span className="text-xs font-bold text-slate-400 truncate w-full block">
            {subValue}
          </span>
        )}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children, height = "h-64", padding = "p-6" }) => (
  <div
    className={`bg-white ${padding} rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col`}
  >
    <h3
      className={`text-sm font-bold text-slate-700 shrink-0 ${padding === "p-6" ? "mb-6" : "mb-3"}`}
    >
      {title}
    </h3>
    <div className={`w-full ${height} flex-auto min-h-0`}>{children}</div>
  </div>
);

const EmptyState = ({ message = "データ不足" }) => (
  <div className="h-full flex flex-col items-center justify-center text-slate-400">
    <Database size={24} className="mb-2 opacity-50" />
    <span className="text-xs font-bold">{message}</span>
  </div>
);

const ActivityHeatmap = ({ activityLog }) => {
  const { weeks, totalContributions } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek));

    const numWeeks = 53;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (numWeeks * 7 - 1));

    const weekData = [];
    let current = new Date(startDate);
    let lastMonth = -1;
    let total = 0;

    for (let w = 0; w < numWeeks; w++) {
      const days = [];
      const weekStartDate = new Date(current);
      const currentMonth = weekStartDate.getMonth();

      let monthLabel = null;
      if (w === 0 || currentMonth !== lastMonth) {
        monthLabel = `${currentMonth + 1}月`;
        lastMonth = currentMonth;
      }

      for (let d = 0; d < 7; d++) {
        const dateKey = formatDateKey(current);
        const count = activityLog[dateKey]?.total || 0;
        const isFuture = current > today;

        if (!isFuture) {
          total += count;
        }

        let intensity = "bg-slate-100";
        if (isFuture) {
          intensity = "bg-transparent opacity-0";
        } else if (count > 0) {
          if (count > 10) intensity = "bg-emerald-600";
          else if (count > 7) intensity = "bg-emerald-500";
          else if (count > 4) intensity = "bg-emerald-400";
          else if (count > 2) intensity = "bg-emerald-300";
          else intensity = "bg-emerald-200";
        }

        days.push({ date: dateKey, count, intensity, isFuture });
        current.setDate(current.getDate() + 1);
      }
      weekData.push({ monthLabel, days });
    }
    return { weeks: weekData, totalContributions: total };
  }, [activityLog]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="text-xs text-slate-500 mb-2">
        過去1年間の累計活動量:{" "}
        <span className="font-bold text-slate-800">{totalContributions}</span>
      </div>

      <div className="flex gap-[3px] flex-1 ml-7 min-h-0">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px] flex-1 min-w-0">
            <div className="h-3 relative">
              {week.monthLabel && (
                <span className="absolute left-0 bottom-0 text-[9px] text-slate-400 font-bold whitespace-nowrap leading-none">
                  {week.monthLabel}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[3px]">
              {week.days.map((day, d) => {
                const isLeftEdge = w < 4;
                const isRightEdge = w > weeks.length - 5;
                const isTopEdge = d < 2;

                let tooltipClass =
                  "absolute hidden group-hover:block z-50 pointer-events-none whitespace-nowrap";

                if (isTopEdge) {
                  tooltipClass += " top-full mt-2";
                } else {
                  tooltipClass += " bottom-full mb-2";
                }

                if (isLeftEdge) {
                  tooltipClass += " left-0";
                } else if (isRightEdge) {
                  tooltipClass += " right-0";
                } else {
                  tooltipClass += " left-1/2 -translate-x-1/2";
                }

                let arrowClass =
                  "w-2 h-2 bg-white transform rotate-45 absolute shadow-sm";

                if (isTopEdge) {
                  arrowClass += " -top-1 border-l border-t border-slate-100";
                } else {
                  arrowClass += " -bottom-1 border-r border-b border-slate-100";
                }

                if (isLeftEdge) {
                  arrowClass += " left-1.5";
                } else if (isRightEdge) {
                  arrowClass += " right-1.5";
                } else {
                  arrowClass += " left-1/2 -translate-x-1/2";
                }

                return (
                  <div
                    key={d}
                    className={`w-full aspect-square rounded-[2px] ${day.intensity} group relative`}
                  >
                    {w === 0 && [1, 3, 5].includes(d) && (
                      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 leading-none">
                        {d === 1 && "Mon"}
                        {d === 3 && "Wed"}
                        {d === 5 && "Fri"}
                      </span>
                    )}

                    {!day.isFuture && (
                      <div className={tooltipClass}>
                        <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg text-xs">
                          <p className="font-bold text-slate-700 mb-1">
                            {day.date}
                          </p>
                          <p className="text-slate-500">
                            <span className="font-bold text-emerald-600">
                              {day.count}
                            </span>{" "}
                            updates
                          </p>
                        </div>
                        <div className={arrowClass}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end items-center gap-2 mt-1 text-[9px] text-slate-400 shrink-0">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className="w-2.5 h-2.5 bg-slate-100 rounded-[2px]" />
          <div className="w-2.5 h-2.5 bg-emerald-200 rounded-[2px]" />
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-[2px]" />
          <div className="w-2.5 h-2.5 bg-emerald-600 rounded-[2px]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

const CalendarView = ({ entries, onEdit, onAdd }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const [visibleItems, setVisibleItems] = useState(() => {
    const saved = localStorage.getItem("ES_MANAGER_CALENDAR_SETTINGS");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load calendar settings", e);
      }
    }
    return ["deadline", "createdAt", "completedAt"];
  });
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "ES_MANAGER_CALENDAR_SETTINGS",
      JSON.stringify(visibleItems),
    );
  }, [visibleItems]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handleClosePanel = () => {
    if (isClosing) return;
    setIsClosing(true);

    closeTimerRef.current = setTimeout(() => {
      setSelectedDateDetails(null);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 800);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateDetails(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateDetails(null);
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDateDetails(null);
  };

  const days = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const eventsMap = {};
  entries.forEach((entry) => {
    if (entry.deadline && visibleItems.includes("deadline")) {
      const d = new Date(entry.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const date = d.getDate();
        if (!eventsMap[date]) eventsMap[date] = [];
        eventsMap[date].push({
          ...entry,
          type: "deadline",
          time: entry.deadline,
        });
      }
    }
    if (entry.createdAt && visibleItems.includes("createdAt")) {
      const d = new Date(entry.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const date = d.getDate();
        if (!eventsMap[date]) eventsMap[date] = [];
        eventsMap[date].push({
          ...entry,
          type: "createdAt",
          time: entry.createdAt,
        });
      }
    }
    if (entry.completedAt && visibleItems.includes("completedAt")) {
      const d = new Date(entry.completedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const date = d.getDate();
        if (!eventsMap[date]) eventsMap[date] = [];
        eventsMap[date].push({
          ...entry,
          type: "completedAt",
          time: entry.completedAt,
        });
      }
    }
  });

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px] animate-in fade-in relative">
      <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronUp className="-rotate-90" size={20} />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 w-28 sm:w-32 text-center">
            {year}年 {month + 1}月
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronDown className="-rotate-90" size={20} />
          </button>
          <button
            onClick={goToday}
            className="px-2 sm:px-3 py-1 text-xs font-bold bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors ml-1 sm:ml-2"
          >
            今日
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
          >
            <Columns size={14} />{" "}
            <span className="hidden sm:inline">表示項目設定</span>
          </button>

          {isColumnSelectorOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsColumnSelectorOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-40 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-slate-500 px-2 py-1 mb-1 border-b border-slate-100">
                  表示する項目を選択
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {[
                    {
                      id: "deadline",
                      label: "提出期限",
                      dotColor: "bg-rose-500",
                    },
                    {
                      id: "createdAt",
                      label: "作成日",
                      dotColor: "bg-indigo-500",
                    },
                    {
                      id: "completedAt",
                      label: "提出日",
                      dotColor: "bg-emerald-500",
                    },
                  ].map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleItems.includes(col.id)}
                        onChange={() => {
                          setVisibleItems((prev) =>
                            prev.includes(col.id)
                              ? prev.filter((id) => id !== col.id)
                              : [...prev, col.id],
                          );
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                      />
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${col.dotColor} shrink-0`}
                        ></span>
                        <span className="text-xs text-slate-700">
                          {col.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-white shrink-0">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-bold ${
              i === 0
                ? "text-red-500"
                : i === 6
                  ? "text-blue-500"
                  : "text-slate-600"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="grid grid-cols-7 min-h-full auto-rows-[minmax(80px,auto)] sm:auto-rows-[minmax(100px,auto)]">
          {days.map((day, idx) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = selectedDateDetails?.day === day;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (day) {
                    if (selectedDateDetails?.day === day) {
                      if (!isClosing) {
                        handleClosePanel();
                      } else {
                        if (closeTimerRef.current) {
                          clearTimeout(closeTimerRef.current);
                          closeTimerRef.current = null;
                        }
                        setIsClosing(false);
                      }
                    } else {
                      if (closeTimerRef.current) {
                        clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                      setIsClosing(false);

                      const monthStr = String(month + 1).padStart(2, "0");
                      const dayStr = String(day).padStart(2, "0");
                      setSelectedDateDetails({
                        day: day,
                        fullDateStr: `${year}-${monthStr}-${dayStr}`,
                      });
                    }
                  }
                }}
                className={`border-b border-r border-slate-100 p-0.5 sm:p-1 flex flex-col ${
                  day
                    ? "bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                    : "bg-transparent"
                } ${isSelected ? "bg-indigo-50/50" : ""}`}
              >
                {day && (
                  <>
                    <div
                      className={`text-[10px] sm:text-xs font-bold mb-0.5 flex items-center justify-center shrink-0 w-5 h-5 rounded-full ${
                        isToday ? "text-white bg-indigo-600" : "text-slate-600"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      {eventsMap[day]
                        ?.sort((a, b) => new Date(a.time) - new Date(b.time))
                        .map((entry, i) => {
                          let colorClass = "";
                          let typeLabel = "";

                          if (entry.type === "deadline") {
                            colorClass =
                              "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100";
                            typeLabel = "期限";
                          } else if (entry.type === "createdAt") {
                            colorClass =
                              "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100";
                            typeLabel = "作成";
                          } else if (entry.type === "completedAt") {
                            colorClass =
                              "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100";
                            typeLabel = "提出";
                          }

                          const displayTitle = entry.selectionType
                            ? `${entry.company} - ${entry.selectionType}`
                            : entry.company;

                          const tooltip = `[${typeLabel}] ${displayTitle}`;

                          const isHovered = hoveredEntryId === entry.id;
                          const isOtherHovered =
                            hoveredEntryId !== null &&
                            hoveredEntryId !== entry.id;

                          const hoverEffects = isOtherHovered
                            ? "opacity-30 grayscale-[50%]"
                            : isHovered
                              ? "opacity-100 ring-1 ring-slate-400 shadow-sm z-10 relative"
                              : "opacity-100";

                          return (
                            <div
                              key={`${entry.id}-${entry.type}-${i}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(entry);
                              }}
                              onMouseEnter={() => setHoveredEntryId(entry.id)}
                              onMouseLeave={() => setHoveredEntryId(null)}
                              title={tooltip}
                              className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded-[3px] border cursor-pointer transition-all duration-200 overflow-hidden whitespace-nowrap leading-tight ${colorClass} ${hoverEffects}`}
                              style={{ textOverflow: "clip" }}
                            >
                              {displayTitle}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(selectedDateDetails || isClosing) && (
        <>
          <style>{`
            @keyframes slideUpSmooth {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideDownSmooth {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(100%); opacity: 0; }
            }
            .animate-slide-up-smooth {
              animation: slideUpSmooth 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-slide-down-smooth {
              animation: slideDownSmooth 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed bottom-0 left-4 right-4 sm:left-8 sm:right-8 md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 z-50">
            <div
              className={`max-h-[min(60vh,500px)] w-full bg-white rounded-t-[32px] shadow-[0_-15px_50px_-10px_rgba(0,0,0,0.15)] border border-slate-200 border-b-0 flex flex-col transition-all duration-300 ease-in-out ${isClosing ? "animate-slide-down-smooth" : "animate-slide-up-smooth"}`}
            >
              <div className="p-3 md:p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
                  <Calendar className="text-indigo-600 w-4 h-4 md:w-5 md:h-5" />
                  {selectedDateDetails?.fullDateStr.replace(/-/g, "/")}{" "}
                  のスケジュール
                </h3>
                <button
                  onClick={handleClosePanel}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-3">
                {eventsMap[selectedDateDetails?.day]?.length > 0 ? (
                  eventsMap[selectedDateDetails?.day]
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                    .map((entry, i) => {
                      let colorClass = "";
                      let typeLabel = "";
                      let timeLeftStr = "";

                      if (entry.type === "deadline") {
                        colorClass =
                          "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
                        typeLabel = "期限";

                        const isCompleted = [
                          "提出済",
                          "採用",
                          "不採用",
                        ].includes(entry.status);

                        if (isCompleted) {
                          timeLeftStr = "提出済";
                        } else {
                          const diffMs = new Date(entry.time) - new Date();

                          if (diffMs < 0) {
                            timeLeftStr = "期限切れ";
                          } else {
                            const diffDays = Math.floor(
                              diffMs / (1000 * 60 * 60 * 24),
                            );
                            const diffHours = Math.floor(
                              (diffMs % (1000 * 60 * 60 * 24)) /
                                (1000 * 60 * 60),
                            );
                            if (diffDays > 0) {
                              timeLeftStr = `あと${diffDays}日${diffHours}時間`;
                            } else if (diffHours > 0) {
                              timeLeftStr = `あと${diffHours}時間`;
                            } else {
                              const diffMins = Math.floor(
                                (diffMs % (1000 * 60 * 60)) / (1000 * 60),
                              );
                              timeLeftStr = `あと${diffMins}分`;
                            }
                          }
                        }
                      } else if (entry.type === "createdAt") {
                        colorClass =
                          "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
                        typeLabel = "作成";
                      } else if (entry.type === "completedAt") {
                        colorClass =
                          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
                        typeLabel = "提出";
                      }

                      return (
                        <div
                          key={`detail-${entry.id}-${entry.type}-${i}`}
                          onClick={() => {
                            onEdit(entry);
                            handleClosePanel();
                          }}
                          className={`p-3 md:p-4 rounded-xl border cursor-pointer transition-colors flex items-center justify-between gap-2 md:gap-3 ${colorClass}`}
                        >
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <span className="text-[10px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded bg-white/60 shrink-0">
                              {typeLabel}
                            </span>
                            <div className="flex flex-col md:flex-row md:items-center min-w-0 flex-1">
                              <span className="font-bold text-sm md:text-base truncate leading-tight md:leading-normal">
                                {entry.company}
                              </span>
                              {entry.selectionType && (
                                <span className="text-[10px] md:text-base opacity-80 md:opacity-100 truncate mt-0.5 md:mt-0 md:ml-1">
                                  <span className="hidden md:inline"> - </span>
                                  {entry.selectionType}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 ml-1 md:ml-0">
                            <div className="text-xs md:text-sm font-mono opacity-80">
                              {entry.time.substring(11, 16)}
                            </div>
                            {timeLeftStr && (
                              <div className="text-[9px] md:text-[10px] font-bold mt-0.5">
                                {timeLeftStr}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center text-slate-400 py-10 text-base font-bold flex items-center justify-center h-full">
                    この日の予定はありません
                  </div>
                )}
              </div>

              <div className="p-3 md:p-5 border-t border-slate-100 bg-white">
                <button
                  onClick={() => {
                    if (selectedDateDetails)
                      onAdd(selectedDateDetails.fullDateStr);
                    handleClosePanel();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 md:py-3.5 bg-indigo-600 text-white rounded-xl text-sm md:text-base font-bold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" /> この日付で新規作成
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatisticsView = ({ entries, companyData, activityLog }) => {
  const [showInfo, setShowInfo] = useState(false);

  const stats = useMemo(() => {
    let totalEntries = 0;
    let completedCount = 0;
    let totalCharacters = 0;
    let totalQA = 0;
    let uniqueCompanies = new Set();
    const monthlyStats = {};
    const hourlyCounts = Array(24).fill(0);

    const marginCounts = {
      "余裕(7日以上)": 0,
      "通常(3-7日)": 0,
      "注意(1-3日)": 0,
      当日: 0,
      期限切れ: 0,
    };
    const tagStats = {};
    const selectionCounts = {};
    const charBins = Array(9).fill(0);
    const statusCharStats = {};
    ["未提出", "作成中", "提出済", "採用", "不採用"].forEach(
      (s) => (statusCharStats[s] = { sum: 0, count: 0 }),
    );
    const industryCounts = {};

    const entryCharList = [];
    const companyCharCounts = {};
    const completionList = [];

    let maxCharEntry = { company: "-", chars: 0 };
    let minCharEntry = { company: "-", chars: 999999 };
    let maxCharQA = { question: "-", chars: 0, answer: "", company: "-" };
    let minCharQA = { question: "-", chars: 999999, answer: "", company: "-" };

    const prodTimeStats = { 採用: [], 不採用: [], 提出済: [] };
    const marginStats = { 採用: [], 不採用: [], 提出済: [] };
    const charRateStats = { 採用: [], 不採用: [], 提出済: [] };
    const scatterData = [];
    let yearlyMarginSum = 0;
    let yearlyMarginCount = 0;

    const now = new Date();
    let firstDate = now;
    Object.values(activityLog).forEach((log) => {
      if (log.hourly) {
        Object.entries(log.hourly).forEach(([hour, count]) => {
          const h = parseInt(hour, 10);
          if (!isNaN(h) && h >= 0 && h < 24) {
            hourlyCounts[h] += count;
          }
        });
      }
    });

    entries.forEach((entry) => {
      totalEntries++;
      if (entry.company) uniqueCompanies.add(entry.company);

      const isCompleted = ANALYTICS_STATUS_GROUPS.completed.includes(
        entry.status,
      );
      const isSuccess = entry.status === "採用";

      if (isCompleted) completedCount++;

      const industry =
        companyData[entry.company]?.industry || entry.industry || "未分類";
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;

      if (entry.deadline && isCompleted && entry.completedAt) {
        const targetDate = new Date(entry.completedAt);
        const dead = new Date(entry.deadline);
        const diffDays = (dead - targetDate) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) marginCounts["期限切れ"]++;
        else if (diffDays < 1) marginCounts["当日"]++;
        else if (diffDays <= 3) marginCounts["注意(1-3日)"]++;
        else if (diffDays <= 7) marginCounts["通常(3-7日)"]++;
        else marginCounts["余裕(7日以上)"]++;
      }
      if (isCompleted && entry.createdAt && entry.completedAt) {
        const start = new Date(entry.createdAt);
        const end = new Date(entry.completedAt);
        const hours = Math.max(0, (end - start) / (1000 * 60 * 60));

        if (prodTimeStats[entry.status]) {
          prodTimeStats[entry.status].push(hours);
        }

        if (entry.deadline) {
          const dead = new Date(entry.deadline);
          const startMargin = (dead - start) / (1000 * 60 * 60 * 24);
          const submitMargin = (dead - end) / (1000 * 60 * 60 * 24);

          if (marginStats[entry.status]) {
            marginStats[entry.status].push(submitMargin);
          }

          yearlyMarginSum += submitMargin;
          yearlyMarginCount++;

          if (hours < 300 && startMargin > -10 && startMargin < 200) {
            scatterData.push({
              x: parseFloat(startMargin.toFixed(1)),
              y: parseFloat(hours.toFixed(1)),
              status: entry.status,
              company: entry.company,
            });
          }
        }
      }

      const selType = entry.selectionType || "未設定";
      selectionCounts[selType] = (selectionCounts[selType] || 0) + 1;

      if (entry.createdAt) {
        const created = new Date(entry.createdAt);
        if (created < firstDate) firstDate = created;
        const monthKey = `${created.getFullYear()}/${String(created.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyStats[monthKey])
          monthlyStats[monthKey] = { name: monthKey, created: 0, completed: 0 };
        monthlyStats[monthKey].created++;
      }
      if (entry.updatedAt) {
        if (isCompleted) {
          const updated = new Date(entry.updatedAt);
          const compKey = `${updated.getFullYear()}/${String(updated.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyStats[compKey]) monthlyStats[compKey].completed++;
        }
      }

      if (isCompleted && entry.completedAt && entry.createdAt) {
        const diff = new Date(entry.completedAt) - new Date(entry.createdAt);
        if (diff > 0) {
          completionList.push({
            company: entry.company,
            diff,
            selectionType: entry.selectionType,
          });
        }
      }

      let entryTotalChars = 0;
      let entryCharRates = [];
      if (entry.qas && Array.isArray(entry.qas)) {
        entry.qas.forEach((qa) => {
          if (!qa.answer) return;
          const len = qa.answer.length;
          entryTotalChars += len;
          totalCharacters += len;
          totalQA++;
          if (qa.charLimit && Number(qa.charLimit) > 0) {
            entryCharRates.push(
              Math.min(100, (len / Number(qa.charLimit)) * 100),
            );
          }

          const binIdx = Math.min(Math.floor(len / 100), 8);
          charBins[binIdx]++;

          const stat = entry.status || "未提出";
          if (!statusCharStats[stat])
            statusCharStats[stat] = { sum: 0, count: 0 };
          statusCharStats[stat].sum += len;
          statusCharStats[stat].count++;

          const tags = splitTags(qa.tags);
          tags.forEach((t) => {
            if (!tagStats[t])
              tagStats[t] = {
                total: 0,
                success: 0,
                totalChars: 0,
                count: 0,
              };
            tagStats[t].total++;
            tagStats[t].count++;
            tagStats[t].totalChars += len;
            if (isSuccess) tagStats[t].success++;
          });

          if (len > maxCharQA.chars)
            maxCharQA = {
              question: qa.question,
              chars: len,
              company: entry.company,
              answer: qa.answer,
              selectionType: entry.selectionType,
            };
          if (len > 10 && len < minCharQA.chars)
            minCharQA = {
              question: qa.question,
              chars: len,
              company: entry.company,
              answer: qa.answer,
              selectionType: entry.selectionType,
            };
        });
      }
      if (
        isCompleted &&
        charRateStats[entry.status] &&
        entryCharRates.length > 0
      ) {
        const avgRate =
          entryCharRates.reduce((a, b) => a + b, 0) / entryCharRates.length;
        charRateStats[entry.status].push(avgRate);
      }

      if (isCompleted && entryTotalChars > 0) {
        entryCharList.push({
          company: entry.company,
          selectionType: entry.selectionType,
          chars: entryTotalChars,
        });

        if (!companyCharCounts[entry.company]) {
          companyCharCounts[entry.company] = { sum: 0, count: 0 };
        }
        companyCharCounts[entry.company].sum += entryTotalChars;
        companyCharCounts[entry.company].count++;
      }

      if (isCompleted) {
        if (entryTotalChars > maxCharEntry.chars)
          maxCharEntry = { company: entry.company, chars: entryTotalChars };
        if (entryTotalChars > 0 && entryTotalChars < minCharEntry.chars)
          minCharEntry = { company: entry.company, chars: entryTotalChars };
      }
    });

    const marginData = Object.entries(marginCounts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
    const MARGIN_COLORS = [
      CHART_COLORS.success,
      CHART_COLORS.info,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      "#94a3b8",
    ];

    const tagPassRateData = Object.entries(tagStats)
      .filter(([_, d]) => d.total >= 3)
      .map(([name, d]) => ({
        name,
        rate: Math.round((d.success / d.total) * 100),
        count: d.total,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    let selectionShareData = Object.entries(selectionCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (selectionShareData.length > 5) {
      const others = selectionShareData
        .slice(4)
        .reduce((sum, d) => sum + d.value, 0);
      selectionShareData = selectionShareData.slice(0, 4);
      selectionShareData.push({ name: "その他", value: others });
    }

    const charDistData = charBins.map((count, i) => ({
      name: i === 8 ? "800+" : `${i * 100}`,
      range: i === 8 ? "800文字以上" : `${i * 100}〜${i * 100 + 99}文字`,
      count,
    }));

    const statusAvgCharData = Object.entries(statusCharStats)
      .map(([name, d]) => ({
        name,
        avg: d.count > 0 ? Math.round(d.sum / d.count) : 0,
      }))
      .filter((d) => d.avg > 0);

    const tagAvgCharData = Object.entries(tagStats)
      .filter(([_, d]) => d.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, d]) => ({
        name,
        avg: Math.round(d.totalChars / d.count),
      }));

    const heatmapData = Object.entries(activityLog)
      .map(([date, val]) => ({ date, count: val.total || 0 }))
      .filter((d) => d.count > 0);
    const recentLog = heatmapData
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10)
      .map((d) => ({
        date: d.date.slice(5).replace("-", "/"),
        count: d.count,
      }));
    const monthlyData = Object.values(monthlyStats)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12);
    const hourlyData = hourlyCounts.map((count, hour) => ({
      hour: `${hour}時`,
      count,
    }));
    const industryData = Object.entries(industryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const daysSinceStart =
      totalEntries > 0
        ? Math.max(1, Math.floor((now - firstDate) / (1000 * 60 * 60 * 24)))
        : 0;

    const sortedActivityDates = Object.entries(activityLog)
      .filter(([_, val]) => (val.total || 0) > 0)
      .map(([date]) => date)
      .sort();
    let maxStreak = 0;
    let currentStreak = 0;
    if (sortedActivityDates.length > 0) {
      let tempStreak = 1;
      let prevTime = new Date(sortedActivityDates[0]).setHours(0, 0, 0, 0);
      maxStreak = 1;
      for (let i = 1; i < sortedActivityDates.length; i++) {
        const currTime = new Date(sortedActivityDates[i]).setHours(0, 0, 0, 0);
        if (Math.round((currTime - prevTime) / 86400000) === 1) tempStreak++;
        else tempStreak = 1;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        prevTime = currTime;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastEntryDate = new Date(
        sortedActivityDates[sortedActivityDates.length - 1],
      );
      lastEntryDate.setHours(0, 0, 0, 0);
      if (Math.round((today - lastEntryDate) / 86400000) <= 1) {
        currentStreak = 1;
        let checkTime = lastEntryDate.getTime();
        for (let i = sortedActivityDates.length - 2; i >= 0; i--) {
          const prevEntryTime = new Date(sortedActivityDates[i]).setHours(
            0,
            0,
            0,
            0,
          );
          if (Math.round((checkTime - prevEntryTime) / 86400000) === 1) {
            currentStreak++;
            checkTime = prevEntryTime;
          } else break;
        }
      }
    }

    let salarySum = 0,
      salaryCount = 0,
      holidaySum = 0,
      holidayCount = 0,
      startingSalarySum = 0,
      startingSalaryCount = 0;
    Object.values(companyData).forEach((data) => {
      const salary = parseSalary(data.avgSalary);
      if (salary) {
        salarySum += salary;
        salaryCount++;
      }
      const startSalary = parseSalary(data.startingSalary);
      if (startSalary) {
        startingSalarySum += startSalary;
        startingSalaryCount++;
      }
      const holidayMatch = data.annualHoliday
        ? String(data.annualHoliday).match(/[0-9]+/)
        : null;
      const holiday = holidayMatch ? parseInt(holidayMatch[0], 10) : NaN;
      if (!isNaN(holiday) && holiday > 0) {
        holidaySum += holiday;
        holidayCount++;
      }
    });

    const cospaRanking = Object.entries(companyCharCounts)
      .map(([name, d]) => ({
        name,
        value: Math.round(d.sum / d.count),
      }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 5);

    const tagWeaponRanking = Object.entries(tagStats)
      .filter(([_, d]) => d.count >= 2)
      .map(([name, d]) => ({
        name,
        value: Math.round(d.totalChars / d.count),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const effortRanking = entryCharList
      .sort((a, b) => b.chars - a.chars)
      .slice(0, 5)
      .map((d) => ({
        company: d.company,
        selectionType: d.selectionType,
        value: d.chars,
      }));

    const completionRanking = completionList
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
      .map((d) => {
        const diffMin = Math.floor(d.diff / (1000 * 60));
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        let timeStr = "";
        if (diffDay > 0) timeStr = `${diffDay}日`;
        else if (diffHour > 0) timeStr = `${diffHour}時間`;
        else timeStr = `${diffMin}分`;
        return {
          company: d.company,
          selectionType: d.selectionType,
          value: timeStr,
        };
      });

    const calcAvg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const prodTimeChartData = Object.keys(prodTimeStats)
      .map((s) => ({
        name: s,
        value: parseFloat(calcAvg(prodTimeStats[s]).toFixed(1)),
      }))
      .filter((d) => d.value > 0);

    const marginChartData = Object.keys(marginStats)
      .map((s) => ({
        name: s,
        value: parseFloat(calcAvg(marginStats[s]).toFixed(1)),
      }))
      .filter((d) => d.name && marginStats[d.name].length > 0);

    const charRateChartData = Object.keys(charRateStats)
      .map((s) => ({
        name: s,
        value: Math.round(calcAvg(charRateStats[s])),
      }))
      .filter((d) => d.value > 0);

    return {
      overview: {
        totalEntries,
        completedCount,
        companyCount: uniqueCompanies.size,
        totalQA,
        totalCharacters,
        avgCharsPerQA: totalQA > 0 ? Math.round(totalCharacters / totalQA) : 0,
        daysSinceStart,
        manuscriptPages: (totalCharacters / 400).toFixed(1),
        currentStreak,
        maxStreak,
      },
      charts: {
        heatmapData,
        recentLog,
        monthlyData,
        hourlyData,
        marginData,
        MARGIN_COLORS,
        tagPassRateData,
        selectionShareData,
        charDistData,
        statusAvgCharData,
        tagAvgCharData,
        industryData,
        tagWeaponRanking,
        effortRanking,
        cospaRanking,
        completionRanking,
        prodTimeChartData,
        marginChartData,
        charRateChartData,
        scatterChartData: scatterData,
      },
      market: {
        avgSalary:
          salaryCount > 0 ? Math.floor(salarySum / salaryCount / 10000) : "-",
        avgStartingSalary:
          startingSalaryCount > 0
            ? Math.round(startingSalarySum / startingSalaryCount)
            : "-",
        avgHoliday:
          holidayCount > 0 ? Math.round(holidaySum / holidayCount) : "-",
        avgYearlyMargin:
          yearlyMarginCount > 0
            ? (yearlyMarginSum / yearlyMarginCount).toFixed(1)
            : "-",
      },
      awards: {
        maxCharEntry: maxCharEntry.chars > 0 ? maxCharEntry : null,
        minCharEntry: minCharEntry.chars < 999999 ? minCharEntry : null,
        maxCharQA: maxCharQA.chars > 0 ? maxCharQA : null,
        minCharQA: minCharQA.chars < 999999 ? minCharQA : null,
      },
    };
  }, [entries, companyData, activityLog]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-slate-700 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <style>{`
        .recharts-surface:focus,
        .recharts-wrapper:focus,
        .recharts-sector:focus,
        .recharts-layer:focus,
        path:focus,
        rect:focus,
        g:focus {
          outline: none !important;
        }
      `}</style>

      {/* Section 0: Header */}
      <div className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-200 shrink-0">
            <BarChart3 size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-none truncate">
              ダッシュボード
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 truncate">
                活動状況の分析概要
              </p>

              <div className="relative group z-30 flex items-center ml-0.5">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="outline-none focus:text-indigo-500"
                >
                  <Info
                    size={14}
                    className={`transition-colors ${showInfo ? "text-indigo-500" : "text-slate-300 group-hover:text-indigo-500"}`}
                  />
                </button>

                {showInfo && (
                  <div
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setShowInfo(false)}
                  />
                )}

                <div
                  className={`
                    absolute z-30 
                    left-0 top-full mt-2 w-60 sm:w-max sm:left-full sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 sm:ml-3
                    ${showInfo ? "block" : "hidden group-hover:block"}
                  `}
                >
                  <div className="bg-slate-50 border border-slate-300 text-slate-500 text-xs p-3 rounded-lg relative leading-relaxed animate-in fade-in slide-in-from-left-1 text-left shadow-lg">
                    <div className="sm:hidden w-2 h-2 bg-slate-50 border-l border-t border-slate-300 transform rotate-45 absolute -top-1.5 left-2"></div>
                    <div className="hidden sm:block w-2 h-2 bg-slate-50 border-l border-b border-slate-300 transform rotate-45 absolute -left-1.5 top-1/2 -translate-y-1/2"></div>
                    入力内容に基づく単純な集計・推計値です。
                    <br />
                    あくまで活動の目安としてご活用ください。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-200 shadow-sm shrink-0">
          <div className="p-1 sm:p-1.5 bg-blue-50 text-blue-500 rounded-full">
            <Calendar size={12} className="sm:w-[14px] sm:h-[14px]" />
          </div>
          <span className="hidden sm:inline text-xs font-bold text-slate-500">
            活動開始から
          </span>
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-base sm:text-xl font-black text-slate-700 font-mono">
              {stats.overview.daysSinceStart}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400">
              日目
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Hero Metrics */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-4 px-1">
        <Activity size={18} />
        <h3 className="text-sm font-bold">活動サマリー</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="継続ストリーク"
          value={`${stats.overview.currentStreak} Days`}
          subValue={`Best: ${stats.overview.maxStreak} Days`}
          colorClass={{ bg: "bg-amber-50", text: "text-amber-500" }}
        />
        <StatCard
          icon={CheckCircle2}
          label="ESの完了数"
          value={stats.overview.completedCount}
          subValue={`エントリー: ${stats.overview.companyCount}社`}
          colorClass={{ bg: "bg-emerald-50", text: "text-emerald-500" }}
        />
        <StatCard
          icon={Target}
          label="回答の完了数"
          value={stats.overview.totalQA}
          subValue={`平均 ${stats.overview.avgCharsPerQA}文字 / 回答`}
          colorClass={{ bg: "bg-violet-50", text: "text-violet-500" }}
        />
        <StatCard
          icon={PenTool}
          label="総執筆文字数"
          value={stats.overview.totalCharacters.toLocaleString()}
          subValue={`原稿用紙 ${stats.overview.manuscriptPages}枚分`}
          colorClass={{ bg: "bg-rose-50", text: "text-rose-500" }}
        />
      </div>

      {/* Section 2: Activity Analysis */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
        <BarChart3 size={18} />
        <h3 className="text-sm font-bold">活動量分析</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="年間活動ヒートマップ" height="h-40">
            <div className="w-full h-full overflow-x-auto overflow-y-hidden">
              <div className="min-w-[600px] h-full">
                <ActivityHeatmap activityLog={activityLog} />
              </div>
            </div>
          </ChartCard>
        </div>

        <ChartCard title="活動リズム" height="h-40">
          {stats.charts.hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.charts.hourlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hour"
                  fontSize={10}
                  tickLine={false}
                  interval={3}
                  tick={{ fontSize: 9 }}
                  dy={5}
                />
                <YAxis
                  hide
                  domain={[0, "auto"]}
                  tickCount={4}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="count"
                  name="活動量"
                  fill={CHART_COLORS.secondary}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="直近の活動推移">
          {stats.charts.recentLog.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.charts.recentLog}
                margin={{ left: 0, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="date"
                  type="category"
                  width={40}
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="count"
                  name="活動数"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  barSize={15}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="月次活動トレンド">
            {stats.charts.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.monthlyData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    content={<CustomTooltip />}
                  />
                  <Legend
                    iconSize={10}
                    fontSize={12}
                    wrapperStyle={{ paddingTop: "10px" }}
                  />
                  <Bar
                    dataKey="created"
                    name="作成エントリー数"
                    stackId="a"
                    fill="#cbd5e1"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="completed"
                    name="完了数"
                    stackId="a"
                    fill={CHART_COLORS.info}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Section 3: Strategy & Selection Analysis */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
        <Target size={18} />
        <h3 className="text-sm font-bold">戦略・選考分析</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <ChartCard title="提出締め切り余裕度">
          {stats.charts.marginData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.charts.marginData.map((entry, index) => ({
                    ...entry,
                    fill: stats.charts.MARGIN_COLORS[
                      index % stats.charts.MARGIN_COLORS.length
                    ],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  shape={(props) => <Sector {...props} />}
                />
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px" }}
                />
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-slate-400 text-xs font-bold"
                >
                  余裕度
                </text>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="期限データなし" />
          )}
        </ChartCard>

        <ChartCard title="タグ別通過率">
          {stats.charts.tagPassRateData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.charts.tagPassRateData}
                margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  unit="%"
                  fontSize={10}
                  domain={[0, 100]}
                  hide
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={65}
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-slate-100 shadow-sm text-xs rounded">
                          <p className="font-bold">{d.name}</p>
                          <p className="text-emerald-600">
                            通過率: {d.rate}% ({d.count}件中)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="rate"
                  name="通過率"
                  fill={CHART_COLORS.success}
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  background={{ fill: "#f8fafc", radius: [0, 4, 4, 0] }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="データ不足 (3件以上)" />
          )}
        </ChartCard>

        <ChartCard title="選考種別シェア">
          {stats.charts.selectionShareData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.charts.selectionShareData.map((entry, index) => ({
                    ...entry,
                    fill: [
                      CHART_COLORS.primary,
                      CHART_COLORS.info,
                      CHART_COLORS.secondary,
                      CHART_COLORS.warning,
                      "#94a3b8",
                    ][index % 5],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="70%"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  shape={(props) => <Sector {...props} />}
                />
                <Tooltip />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="業界別エントリー数">
          {stats.charts.industryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.charts.industryData}
                margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={10} allowDecimals={false} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={75}
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="value"
                  name="件数"
                  fill={CHART_COLORS.secondary}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      {/* Section 4: Content Analysis */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
        <FileText size={18} />
        <h3 className="text-sm font-bold">コンテンツ傾向分析</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartCard title="回答文字数の分析">
          {stats.charts.charDistData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.charts.charDistData}
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={10} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={30}
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border shadow-sm text-xs rounded">
                          <p className="font-bold">{d.range}</p>
                          <p>{d.count}件</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  name="件数"
                  fill={CHART_COLORS.info}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="ステータス別平均文字数">
          {stats.charts.statusAvgCharData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.charts.statusAvgCharData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="avg"
                  name="平均文字数"
                  fill={CHART_COLORS.secondary}
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="タグ別平均文字数">
          {stats.charts.tagAvgCharData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.charts.tagAvgCharData}
                margin={{ left: 30, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={10} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={60}
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="avg"
                  name="平均文字数"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  barSize={15}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      {/* Section 5: Detailed Rankings */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
        <ListOrdered size={18} />
        <h3 className="text-sm font-bold">詳細ランキング分析</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-6">
        <div className="lg:col-span-3">
          <ChartCard
            title="コスパ重視の狙い目ランキング"
            height="h-full"
            padding="p-4"
          >
            {stats.charts.cospaRanking.length > 0 ? (
              <div className="flex flex-col justify-center h-full space-y-2 px-1">
                {stats.charts.cospaRanking.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                  >
                    <div className="flex items-center gap-3 truncate pr-4 min-w-0 flex-1">
                      <span
                        className={`font-black font-mono text-base flex-shrink-0 ${i < 3 ? "text-emerald-500" : "text-slate-300"}`}
                      >
                        {i + 1}.
                      </span>
                      <span
                        className={`font-bold text-slate-700 truncate ${item.name.length > 10 ? "text-xs" : "text-sm"}`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-400 text-xs whitespace-nowrap flex-shrink-0">
                      {item.value.toLocaleString()}文字
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="データ不足" />
            )}
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard
            title="あなたの語れる武器ランキング"
            height="h-full"
            padding="p-4"
          >
            {stats.charts.tagWeaponRanking.length > 0 ? (
              <div className="flex flex-col justify-center h-full space-y-2 px-1">
                {stats.charts.tagWeaponRanking.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                  >
                    <div className="flex items-center gap-3 truncate pr-4 min-w-0 flex-1">
                      <span
                        className={`font-black font-mono text-base flex-shrink-0 ${i < 3 ? "text-indigo-500" : "text-slate-300"}`}
                      >
                        {i + 1}.
                      </span>
                      <span
                        className={`font-bold text-slate-700 truncate ${item.name.length > 8 ? "text-xs" : "text-sm"}`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-400 text-xs whitespace-nowrap flex-shrink-0">
                      {item.value.toLocaleString()}文字
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="データ不足" />
            )}
          </ChartCard>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <ChartCard
            title="難関突破の努力賞ランキング"
            height="h-full"
            padding="p-4"
          >
            {stats.charts.effortRanking.length > 0 ? (
              <div className="flex flex-col justify-center h-full space-y-2 px-1">
                {stats.charts.effortRanking.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                  >
                    <div className="flex items-center gap-3 truncate pr-4 min-w-0 flex-1">
                      <span
                        className={`font-black font-mono text-lg flex-shrink-0 ${i < 3 ? "text-amber-500" : "text-slate-300"}`}
                      >
                        {i + 1}.
                      </span>
                      <div className="flex flex-col truncate min-w-0">
                        <span
                          className={`font-bold text-slate-700 truncate ${item.company.length > 12 ? "text-xs" : "text-sm"}`}
                        >
                          {item.company}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          {item.selectionType || "未設定"}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-400 text-xs whitespace-nowrap flex-shrink-0">
                      {item.value.toLocaleString()}文字
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="データ不足" />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Section 6: Awards & Speed Ranking */}
      {stats.awards.maxCharQA && (
        <>
          <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
            <Sparkles size={18} />
            <h3 className="text-sm font-bold">アワード・ハイライト</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            <div className="relative w-full">
              <div className="w-full h-full lg:absolute lg:inset-0">
                <div className="relative p-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-amber-50 to-white shadow-md flex flex-col h-full overflow-hidden group">
                  <div className="flex items-center gap-3 mb-4 shrink-0 relative z-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm ring-2 ring-amber-100">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-amber-800 block">
                        過去最高の傑作回答
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {stats.awards.maxCharQA.company}
                        {stats.awards.maxCharQA.selectionType &&
                          ` - ${stats.awards.maxCharQA.selectionType}`}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mb-3 shrink-0 leading-relaxed relative z-10 border-b border-amber-200/50 pb-2">
                    Q. {stats.awards.maxCharQA.question}
                  </h3>

                  <div className="flex-1 relative z-10 overflow-hidden min-h-[100px]">
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        maskImage:
                          "linear-gradient(to bottom, black 60%, transparent 100%)",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, black 60%, transparent 100%)",
                      }}
                    >
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold text-amber-600 mr-2">
                          A.
                        </span>
                        {stats.awards.maxCharQA.answer}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-1 text-amber-500 font-mono text-xs font-bold shrink-0 mt-2 relative z-10">
                    <PenTool size={12} />
                    {stats.awards.maxCharQA.chars.toLocaleString()} 文字
                  </div>

                  <Sparkles
                    className="absolute -right-6 -bottom-6 text-amber-400 opacity-20 z-0 rotate-12"
                    size={180}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {stats.awards.minCharQA && (
                <div className="relative p-5 rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-200 via-slate-50 to-white shadow-sm h-auto shrink-0 overflow-hidden">
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-sm ring-2 ring-slate-100">
                      <Zap size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">
                        無駄を削ぎ落とした核心の回答
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {stats.awards.minCharQA.company}
                        {stats.awards.minCharQA.selectionType &&
                          ` - ${stats.awards.minCharQA.selectionType}`}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 mb-2 leading-relaxed relative z-10">
                    Q. {stats.awards.minCharQA.question}
                  </h3>

                  <div className="bg-white/60 p-3 rounded-lg border border-slate-200 mb-2 relative z-10">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-500 mr-2">A.</span>
                      {stats.awards.minCharQA.answer}
                    </p>
                  </div>

                  <div className="flex justify-end text-[10px] font-bold text-slate-400 font-mono relative z-10">
                    {stats.awards.minCharQA.chars} 文字
                  </div>

                  <Zap
                    className="absolute -right-4 -bottom-4 text-slate-400 opacity-10 z-0 -rotate-12"
                    size={120}
                  />
                </div>
              )}

              <div className="flex-1">
                <ChartCard
                  title="ES完成スピードランキング"
                  height="h-auto"
                  padding="p-4"
                >
                  {stats.charts.completionRanking.length > 0 ? (
                    <div className="flex flex-col space-y-2 px-1">
                      {stats.charts.completionRanking.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                        >
                          <div className="flex items-center gap-3 truncate pr-4 min-w-0 flex-1">
                            <span
                              className={`font-black font-mono text-lg flex-shrink-0 ${
                                i < 3 ? "text-blue-500" : "text-slate-300"
                              }`}
                            >
                              {i + 1}.
                            </span>
                            <div className="flex flex-col truncate min-w-0">
                              <span
                                className={`font-bold text-slate-700 truncate ${
                                  item.company.length > 12
                                    ? "text-xs"
                                    : "text-sm"
                                }`}
                              >
                                {item.company}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 truncate">
                                {item.selectionType || "未設定"}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-500 text-xs whitespace-nowrap flex-shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="完了データ不足" />
                  )}
                </ChartCard>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Section 7: Deep Analytics */}
      <div className="flex items-center gap-2 text-slate-500 mb-2 mt-8 px-1">
        <Activity size={18} />
        <h3 className="text-sm font-bold">相関傾向分析</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="あなたの希望平均年収"
          value={
            typeof stats.market.avgSalary === "number"
              ? `${stats.market.avgSalary.toLocaleString()}万円`
              : "-"
          }
          colorClass={{ bg: "bg-emerald-50", text: "text-emerald-500" }}
        />
        <StatCard
          icon={DollarSign}
          label="あなたの希望初任給"
          value={
            typeof stats.market.avgStartingSalary === "number"
              ? `${stats.market.avgStartingSalary.toLocaleString()}円`
              : "-"
          }
          colorClass={{ bg: "bg-emerald-50", text: "text-emerald-500" }}
        />
        <StatCard
          icon={CalendarCheck}
          label="あなたの希望年間休日"
          value={
            typeof stats.market.avgHoliday === "number"
              ? `${stats.market.avgHoliday}日`
              : "-"
          }
          colorClass={{ bg: "bg-blue-50", text: "text-blue-500" }}
        />
        <StatCard
          icon={Calendar}
          label="平均提出余裕日数"
          value={
            stats.market.avgYearlyMargin !== "-"
              ? `${stats.market.avgYearlyMargin}日`
              : "-"
          }
          colorClass={{ bg: "bg-indigo-50", text: "text-indigo-500" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <ChartCard title="制作所要時間と採用の関係">
          {stats.charts.prodTimeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.charts.prodTimeChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="value"
                  name="平均所要時間"
                  fill={CHART_COLORS.info}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="データ不足" />
          )}
        </ChartCard>

        <ChartCard title="提出余裕日数と採用の関係">
          {stats.charts.marginChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.charts.marginChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="value"
                  name="平均余裕日数"
                  fill={CHART_COLORS.success}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="データ不足" />
          )}
        </ChartCard>

        <ChartCard title="文字数充足率と採用の関係">
          {stats.charts.charRateChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.charts.charRateChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="value"
                  name="平均充足率(%)"
                  fill={CHART_COLORS.warning}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="データ不足" />
          )}
        </ChartCard>

        <div className="lg:col-span-3">
          <ChartCard title="着手の早さと制作所要時間の相関">
            {stats.charts.scatterChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                  <CartesianGrid />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="着手時の余裕日数"
                    unit="日"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="制作時間"
                    unit="h"
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter
                    name="採用"
                    data={stats.charts.scatterChartData.filter(
                      (d) => d.status === "採用",
                    )}
                    fill={CHART_COLORS.warning}
                  />
                  <Scatter
                    name="不採用"
                    data={stats.charts.scatterChartData.filter(
                      (d) => d.status === "不採用",
                    )}
                    fill={CHART_COLORS.danger}
                  />
                  <Scatter
                    name="提出済"
                    data={stats.charts.scatterChartData.filter(
                      (d) => d.status === "提出済",
                    )}
                    fill={CHART_COLORS.success}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="データ不足" />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
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
                placeholder="例: 〇〇株式会社"
                value={newCompanyName}
                onChange={handleNameChange}
                autoFocus={!companyName}
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
                placeholder="例: IT、営業"
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
                マイページID番号
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="例: AA12345..."
                value={data.idNumber}
                onChange={(e) => handleChange("idNumber", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                採用人数 (名)
              </label>
              <div className="relative">
                <Users
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 100"
                  value={data.hiringNumber}
                  onChange={(e) => handleChange("hiringNumber", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                平均年収 (万円)
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 500"
                  value={data.avgSalary}
                  onChange={(e) => handleChange("avgSalary", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                初任給 (円)
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 250,000"
                  value={data.startingSalary}
                  onChange={(e) =>
                    handleChange("startingSalary", e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                年間休日 (日)
              </label>
              <div className="relative">
                <CalendarCheck
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs outline-none focus:border-indigo-500"
                  placeholder="例: 125"
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
              placeholder="メモや特記事項"
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
    </div>,
    document.body,
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
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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
            tags: Array.isArray(qa.tags) ? qa.tags : splitTags(qa.tags),
            status: entry.status || "",
            charLimit: qa.charLimit || "",
          });
        });
      }
    });

    if (!search) return allItems;

    const rawTerms = search
      .toLowerCase()
      .replace(/＃/g, "#")
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);
    const hasCharSearch = rawTerms.some((t) => t.includes("文字"));

    const tagTerms = rawTerms
      .filter((t) => t.startsWith("#"))
      .map((t) => t.slice(1));
    const positiveTerms = rawTerms.filter(
      (t) => !t.startsWith("-") && !t.startsWith("#"),
    );
    const negativeTerms = rawTerms
      .filter((t) => t.startsWith("-"))
      .map((t) => t.slice(1));

    return allItems.filter((item) => {
      const hasAllTags = tagTerms.every((term) =>
        item.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
      if (!hasAllTags) return false;

      const text = [
        item.company,
        item.industry,
        item.selectionType,
        item.status,
        item.question,
        item.answer,
        item.tags.join(" "),
        hasCharSearch && item.charLimit ? `${item.charLimit}文字` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const isMatch = positiveTerms.every((term) => text.includes(term));
      const isNotExcluded = negativeTerms.every((term) => !text.includes(term));

      return isMatch && isNotExcluded;
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
            ref={searchInputRef}
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
                  <StatusBadge status={item.status} />
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

            <div className="mt-2 flex flex-wrap justify-between items-end gap-2">
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                  >
                    #
                    <HighlightText text={tag} highlight={search} isTag={true} />
                  </span>
                ))}
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
                {item.answer ? item.answer.length : 0}文字
              </div>
            </div>
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
  const [keepInstruction, setKeepInstruction] = useState("never");
  const [showPromptMode, setShowPromptMode] = useState(false);
  const [showModelName, setShowModelName] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("GEMINI_API_KEY") || "");
      setAutoSave(initialSettings?.autoSave || false);
      setWritingStyle(initialSettings?.writingStyle || "");
      setCheckNgWords(initialSettings?.checkNgWords ?? true);
      setShowChecksInList(initialSettings?.showChecksInList ?? false);
      const savedKeep = initialSettings?.keepInstruction;
      if (savedKeep === true) setKeepInstruction("always");
      else if (savedKeep === false) setKeepInstruction("never");
      else setKeepInstruction(savedKeep || "never");
      setShowPromptMode(initialSettings?.showPromptMode ?? false);
      setShowModelName(initialSettings?.showModelName ?? false);
    }
  }, [isOpen, initialSettings]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
      keepInstruction,
      showPromptMode,
      showModelName,
    };
    onSettingsSave(newSettings);

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
          {/* Grammar Highlighting Settings */}
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
                      リスト表示や参照パネルでも、校正箇所を警告します。
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* API Key Settings */}
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

          {/* AI Instruction Setting */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <StickyNote size={16} /> AI指示保持設定
            </h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="keepInstruction"
                  value="always"
                  checked={keepInstruction === "always"}
                  onChange={(e) => setKeepInstruction(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <div>
                  <span className="block text-sm font-bold text-slate-700">
                    常に保持する
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    AI出力を閉じても、常に入力した指示内容が残ります。
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="keepInstruction"
                  value="clear_on_success"
                  checked={keepInstruction === "clear_on_success"}
                  onChange={(e) => setKeepInstruction(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <div>
                  <span className="block text-sm font-bold text-slate-700">
                    出力成功するまで保持する
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    AI出力が成功した場合はリセットし、エラー時は残します。
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="keepInstruction"
                  value="never"
                  checked={keepInstruction === "never"}
                  onChange={(e) => setKeepInstruction(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <div>
                  <span className="block text-sm font-bold text-slate-700">
                    保持しない
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    AI出力を閉じると、常に入力した指示内容をリセットします。
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Prompt Output Settings */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <MessageSquareCode size={16} /> プロンプト出力設定
            </h4>
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={showPromptMode}
                onChange={(e) => setShowPromptMode(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
              />
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-700">
                  プロンプト出力モードを利用する
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                  APIキーが設定されている場合、AIへのプロンプトを送信せずに出力する機能が利用できるようになります。
                </span>
              </div>
            </label>
          </div>

          {/* Model Display Settings */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Bot size={16} /> AIモデル名表示設定
            </h4>
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={showModelName}
                onChange={(e) => setShowModelName(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
              />
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-700">
                  思考中にモデル名を表示する
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                  AIの思考中に利用しているモデル名を表示します。
                </span>
              </div>
            </label>
          </div>

          <hr className="border-slate-100" />

          {/* Auto Save Settings */}
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
                  オートセーブを有効にする
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                  入力されたデータを自動でブラウザに保存します。セキュリティ保護のため、共用PCなどではチェックを入れないでください。
                </span>
                {!autoSave && (
                  <span className="block text-xs text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    OFFの場合、ブラウザを閉じるとデータは削除されます。
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
    </div>,
    document.body,
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
            tags: Array.isArray(qa.tags) ? qa.tags : splitTags(qa.tags),
            updatedAt: entry.updatedAt,
            status: entry.status || "",
            charLimit: qa.charLimit || "",
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

    const rawTerms = search
      .toLowerCase()
      .replace(/＃/g, "#")
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);
    const hasCharSearch = rawTerms.some((t) => t.includes("文字"));

    const tagTerms = rawTerms
      .filter((t) => t.startsWith("#"))
      .map((t) => t.slice(1));
    const positiveTerms = rawTerms.filter(
      (t) => !t.startsWith("-") && !t.startsWith("#"),
    );
    const negativeTerms = rawTerms
      .filter((t) => t.startsWith("-"))
      .map((t) => t.slice(1));

    return targetList.filter((item) => {
      const hasAllTags = tagTerms.every((term) =>
        item.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
      if (!hasAllTags) return false;

      const text = [
        item.company,
        item.industry,
        item.selectionType,
        item.status,
        item.question,
        item.answer,
        item.tags.join(" "),
        hasCharSearch && item.charLimit ? `${item.charLimit}文字` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const isMatch = positiveTerms.every((term) => text.includes(term));
      const isNotExcluded = negativeTerms.every((term) => !text.includes(term));

      return isMatch && isNotExcluded;
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
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
                autoFocus
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
                        <StatusBadge status={item.status} />
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

                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 flex flex-col">
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap flex-1">
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
                        {(() => {
                          const searchTerms = search
                            .toLowerCase()
                            .replace(/＃/g, "#")
                            .split(/[\s\u3000]+/)
                            .filter((t) => t.length > 0 && !t.startsWith("-"))
                            .map((t) => (t.startsWith("#") ? t.slice(1) : t));

                          const matchedTags =
                            searchTerms.length > 0
                              ? item.tags.filter((tag) =>
                                  searchTerms.some((term) =>
                                    tag.toLowerCase().includes(term),
                                  ),
                                )
                              : [];

                          if (matchedTags.length === 0) return null;

                          return (
                            <div className="mt-2 flex flex-wrap gap-1 shrink-0">
                              {matchedTags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                                >
                                  #
                                  <HighlightText
                                    text={tag}
                                    highlight={search}
                                    isTag={true}
                                  />
                                </span>
                              ))}
                            </div>
                          );
                        })()}
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
    </div>,
    document.body,
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
  keepInstruction = "never",
  showPromptMode = true,
  showModelName = false,
  isActive = true,
  appSettings,
}) => {
  const hasApiKey = localStorage.getItem("GEMINI_API_KEY");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [mode, setMode] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [currentModel, setCurrentModel] = useState("");
  const [isPromptMode, setIsPromptMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!hasApiKey) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleAction = async (actionType, directRefs = null) => {
    if ((actionType === "refine" || actionType === "feedback") && !answer)
      return;

    setLoading(true);
    setMode(actionType);
    setResult("");
    setCurrentModel("");
    setIsCompact(false);

    const styleInstruction =
      writingStyle === "keigo"
        ? "回答の文体は敬体(です・ます調)で統一してください。"
        : writingStyle === "joutai"
          ? "回答の文体は常体(だ・である調)で統一してください。"
          : "";

    const contextInfo = `【応募先情報】
・企業名: ${company || "未定"}
・業界: ${industry || "未定"}
・選考種別: ${selectionType || "未定"}`;

    const commonInputSection = `【質問内容】
${question}

【補足事項/前提条件】
${note || "なし"}
${charLimit ? `(制限: ${charLimit}文字)` : ""}`;

    const commonConstraints = `【制約条件】
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
評価を出力する前に、内部的に以下のチェックを行ってください(出力には含めなくて良いですが、評価に反映させてください):
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
以下の「現在の回答案」をベースにし、「参考にする過去の回答」の表現や要素(言葉遣い、強み、エピソードなど)をうまく取り入れて、質問内容に対する回答を作成してください。
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

    if (isPromptMode) {
      const fullPrompt = `[systemPrompt]
${systemPrompt.replace(/^[ \t]+/gm, "")}

[userPrompt]
${userPrompt.replace(/^[ \t]+/gm, "")}`;

      setResult(fullPrompt);
      setLoading(false);
      return;
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
    let shouldClear = true;
    if (keepInstruction === "always" || keepInstruction === true) {
      shouldClear = false;
    } else if (keepInstruction === "clear_on_success") {
      if (isPromptMode || isError) {
        shouldClear = false;
      }
    }

    setResult("");
    setMode(null);
    if (shouldClear) {
      setInstruction("");
    }
    setSelectedRefs([]);
    setIsCopied(false);
  };

  const isError =
    !isPromptMode &&
    (result.startsWith("エラー") ||
      result.startsWith("APIキー") ||
      result.startsWith("AIからの"));

  const themeColor = isPromptMode ? "emerald" : "indigo";
  const ThemeIcon = isPromptMode
    ? MessageSquareCode
    : mode === "feedback"
      ? Bot
      : mode === "generate"
        ? BookOpen
        : Sparkles;

  const titleText = isPromptMode
    ? "生成プロンプト (外部AI用)"
    : mode === "feedback"
      ? "AIフィードバック"
      : "AI生成結果";

  const containerClass = isPromptMode
    ? "mt-3 bg-white rounded-xl border shadow-sm overflow-hidden animate-in slide-in-from-top-2 border-emerald-100"
    : "mt-3 bg-white rounded-xl border shadow-sm overflow-hidden animate-in slide-in-from-top-2 border-indigo-100";

  const headerClass = isPromptMode
    ? "px-4 py-2 border-b flex justify-between items-center bg-emerald-50/50 border-emerald-100"
    : "px-4 py-2 border-b flex justify-between items-center bg-indigo-50/50 border-indigo-100";

  const titleColorClass = isPromptMode
    ? "flex items-center gap-2 text-sm font-bold text-emerald-800"
    : "flex items-center gap-2 text-sm font-bold text-indigo-800";

  const footerClass = isPromptMode
    ? "p-3 bg-slate-50 border-t flex justify-between items-center border-emerald-50"
    : "p-3 bg-slate-50 border-t flex justify-between items-center border-indigo-50";

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
          !mode && isActive
            ? "grid-rows-[1fr] opacity-100 mt-2"
            : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex gap-2 flex-wrap items-center justify-end pb-1">
            <div className="w-full sm:flex-1 sm:w-auto min-w-[200px]">
              <input
                type="text"
                placeholder="AIへの指示 (例: 具体的に、簡潔に...)"
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                tabIndex={isActive ? 0 : -1}
              />
            </div>
            <button
              onClick={() => handleAction("refine")}
              disabled={!answer || !isActive}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              tabIndex={isActive ? 0 : -1}
            >
              <Sparkles size={12} /> 推敲
            </button>
            <button
              onClick={() => handleAction("feedback")}
              disabled={!answer || !isActive}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
              tabIndex={isActive ? 0 : -1}
            >
              <Bot size={14} /> FB
            </button>
            <button
              onClick={() => setIsRefModalOpen(true)}
              disabled={!isActive}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
              tabIndex={isActive ? 0 : -1}
            >
              <BookOpen size={12} /> 統合
            </button>

            {showPromptMode && (
              <label
                className="flex items-center cursor-pointer select-none ml-1"
                title="プロンプトを表示します"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPromptMode}
                    onChange={(e) => setIsPromptMode(e.target.checked)}
                    className="sr-only"
                    disabled={!isActive}
                    tabIndex={isActive ? 0 : -1}
                  />
                  <div
                    className={`w-9 h-5 rounded-full shadow-inner transition-colors duration-200 ease-in-out ${
                      isPromptMode ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  ></div>
                  <div
                    className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out flex items-center justify-center ${
                      isPromptMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  >
                    <MessageSquareCode
                      size={10}
                      className={`transition-opacity duration-200 ${
                        isPromptMode
                          ? "text-emerald-600 opacity-100"
                          : "opacity-0"
                      }`}
                    />
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-sm text-slate-500 animate-pulse">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span>
            {isPromptMode
              ? "プロンプトを生成中..."
              : `AIが思考中... ${showModelName && currentModel ? `(${currentModel})` : ""}`}
          </span>
        </div>
      )}

      {result && !loading && (
        <div className={containerClass}>
          <div className={headerClass}>
            <div className={titleColorClass}>
              <ThemeIcon size={16} />
              {titleText}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCompact(!isCompact)}
                className="text-slate-400 hover:text-slate-600 px-1 transition-transform"
              >
                {isCompact ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </button>
              <button
                onClick={close}
                title="閉じる"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isCompact && (
            <>
              <div className="p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white font-sans">
                {result}
              </div>
              <div className={footerClass}>
                <div className="text-xs font-mono text-slate-500 pl-1">
                  {mode !== "feedback" &&
                    !isError &&
                    !(
                      isPromptMode &&
                      (mode === "refine" || mode === "generate")
                    ) &&
                    `${result.length}文字`}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={close}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    閉じる
                  </button>

                  {isPromptMode ? (
                    <button
                      onClick={handleCopyPrompt}
                      className={`px-3 py-1.5 text-xs font-bold text-white rounded-md shadow-sm flex items-center gap-1.5 transition-colors ${
                        isCopied
                          ? "bg-emerald-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? "コピー完了" : "コピー"}
                    </button>
                  ) : (
                    mode !== "feedback" &&
                    !isError && (
                      <button
                        onClick={() => {
                          onApply(result);
                          close();
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Check size={14} /> 反映する
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <ReferenceSelectorModal
        isOpen={isRefModalOpen}
        onClose={() => setIsRefModalOpen(false)}
        entries={allEntries}
        onSelect={handleSelectReferences}
        currentQuestion={question}
        appSettings={appSettings}
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
              #<HighlightText text={tag} highlight={highlight} isTag={true} />
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
              href={getSafariUrl(companyUrl)}
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
                        #
                        <HighlightText
                          text={tag}
                          highlight={highlight}
                          isTag={true}
                        />
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
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveItemId(null);
        if (document.activeElement) document.activeElement.blur();
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
    const inputType = e.nativeEvent.inputType;

    const isTyping =
      inputType === "insertText" ||
      inputType === "insertCompositionText" ||
      inputType === "deleteContentBackward" ||
      inputType === "deleteContentForward";

    let newTitle = val;

    if (!isTyping && companyNames.includes(val)) {
      const now = new Date();
      newTitle = `${now.getMonth() + 1}月${now.getDate()}日の${val}のメモ`;

      setTimeout(() => {
        const nextInput = document.querySelector(
          'input[placeholder="質問・項目"]',
        );
        if (nextInput) nextInput.focus();
      }, 0);
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
              autoFocus={!data.title}
              onChange={handleTitleChange}
              list="company-list-suggestions"
            />
            <datalist id="company-list-suggestions">
              {companyNames
                .filter((name) => name !== data.title)
                .map((name) => (
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
                      placeholder="回答・内容"
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

const WelcomeModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-200 p-8">
        <img
          src="/favicon.png"
          alt="ES Manager Icon"
          className="w-16 h-16 rounded-2xl shadow-sm mb-6"
        />

        <h2 className="text-2xl font-black text-slate-800 mb-4 text-center">
          ES Manager へようこそ！
        </h2>

        <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
          就職活動におけるエントリーシートを一元管理し、作成を効率化するためのツールです。
        </p>

        <div className="w-full bg-slate-50 rounded-xl p-5 mb-8">
          <ul className="space-y-3 text-sm text-slate-700 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-500 shrink-0 mt-0.5"
              />
              <span>企業ごとのES進捗や提出期限の管理</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-500 shrink-0 mt-0.5"
              />
              <span>過去の回答の簡単な検索と再利用</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={18}
                className="text-emerald-500 shrink-0 mt-0.5"
              />
              <span>AIを活用した回答の推敲・フィードバック</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
        >
          はじめる
        </button>
      </div>
    </div>,
    document.body,
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
  // --- Tutorial State ---
  const [tutorialProgress, setTutorialProgress] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TUTORIAL);
    return saved
      ? { ...DEFAULT_TUTORIAL_STATE, ...JSON.parse(saved) }
      : DEFAULT_TUTORIAL_STATE;
  });

  const updateTutorialProgress = (updates) => {
    setTutorialProgress((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY_TUTORIAL, JSON.stringify(next));
      return next;
    });
  };

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(
    () => !tutorialProgress.hasSeenWelcome,
  );
  const [showNewEntryTooltip, setShowNewEntryTooltip] = useState(() => {
    return (
      tutorialProgress.hasSeenWelcome && !tutorialProgress.hasClickedNewEntry
    );
  });
  const [formTutorialStep, setFormTutorialStep] = useState(0);
  const [showFeatureUnlockTooltip, setShowFeatureUnlockTooltip] = useState(
    () => {
      return (
        tutorialProgress.hasCreatedFirstData &&
        !tutorialProgress.hasSeenFeatureUnlockTooltip
      );
    },
  );

  const [showMemoTooltip, setShowMemoTooltip] = useState(() => {
    return (
      tutorialProgress.hasCreatedFirstMemo &&
      !tutorialProgress.hasSeenMemoTooltip
    );
  });

  const handleCloseMemoTooltip = (e) => {
    if (e) e.stopPropagation();
    setShowMemoTooltip(false);
    updateTutorialProgress({ hasSeenMemoTooltip: true });
  };

  const handleNextFormTutorial = () => {
    if (formTutorialStep < 4) {
      setFormTutorialStep((prev) => prev + 1);
    } else {
      setFormTutorialStep(0);
      updateTutorialProgress({ hasSeenFormTutorial: true });
      scrollToTop("smooth");
      setTimeout(() => {
        document
          .getElementById("company-input")
          ?.focus({ preventScroll: true });
      }, 100);
    }
  };

  const formTutorialContent = {
    1: {
      title: "基本情報の入力",
      text: "企業名やステータス、提出期限などの基本情報を入力します。企業名は必須です。",
    },
    2: {
      title: "ES回答の作成",
      text: "質問内容と回答を入力します。制限文字数やAI機能、タグによる分類が利用できます。",
    },
    3: {
      title: "質問の追加",
      text: "複数の設問がある場合は、ここから追加することができます。",
    },
    4: {
      title: "保存して完了",
      text: "入力が完了したら保存しましょう。何度でも再開や編集が可能です。",
    },
  };

  useEffect(() => {
    if (formTutorialStep > 0) {
      const timer = setTimeout(() => {
        const target = document.querySelector(
          `[data-tutorial="${formTutorialStep}"]`,
        );
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formTutorialStep]);

  useEffect(() => {
    if (formTutorialStep > 0) {
      const preventScroll = (e) => e.preventDefault();
      const preventKey = (e) => {
        const blockedKeys = [
          "ArrowUp",
          "ArrowDown",
          "Space",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          "Tab",
        ];
        if (blockedKeys.includes(e.code)) {
          e.preventDefault();
        }
      };

      window.addEventListener("wheel", preventScroll, { passive: false });
      window.addEventListener("touchmove", preventScroll, { passive: false });
      window.addEventListener("keydown", preventKey, { passive: false });

      return () => {
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
        window.removeEventListener("keydown", preventKey);
      };
    }
  }, [formTutorialStep]);

  const handleCloseWelcomeModal = () => {
    updateTutorialProgress({ hasSeenWelcome: true });
    setIsWelcomeModalOpen(false);

    if (!tutorialProgress.hasClickedNewEntry) {
      setTimeout(() => {
        setShowNewEntryTooltip(true);
      }, 400);
    }
  };

  const handleCloseFeatureUnlockTooltip = (e) => {
    if (e) e.stopPropagation();
    setShowFeatureUnlockTooltip(false);
    updateTutorialProgress({ hasSeenFeatureUnlockTooltip: true });
  };

  const [entries, setEntries] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [view, setView] = useState("list");
  const [viewMode, setViewMode] = useState("company");

  useEffect(() => {
    if (
      showFeatureUnlockTooltip &&
      (view !== "list" || viewMode !== "company")
    ) {
      handleCloseFeatureUnlockTooltip();
    }
  }, [view, viewMode, showFeatureUnlockTooltip]);

  useEffect(() => {
    if (showMemoTooltip && (view !== "list" || viewMode !== "drafts")) {
      handleCloseMemoTooltip();
    }
  }, [view, viewMode, showMemoTooltip]);

  useEffect(() => {
    if (drafts.length > 0 && !tutorialProgress.hasCreatedFirstMemo) {
      updateTutorialProgress({
        hasCreatedFirstMemo: true,
        hasSeenMemoTooltip: true,
      });
      setShowMemoTooltip(false);
    }
  }, [drafts.length, tutorialProgress.hasCreatedFirstMemo]);

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
    keepInstruction: "clear_on_success",
    showPromptMode: false,
    showModelName: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  const [activeQAId, setActiveQAId] = useState(null);
  const [activeTagDropdownId, setActiveTagDropdownId] = useState(null);

  const [activityLog, setActivityLog] = useState({});

  const [toast, setToast] = useState(null);

  const lastSavedDataStr = useRef("");
  const lastSavedLogStr = useRef("");

  const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);

  const [collapsedStatuses, setCollapsedStatuses] = useState({});
  const toggleStatusCollapse = (status) => {
    setCollapsedStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const [collapsedTags, setCollapsedTags] = useState({});
  const toggleTagCollapse = (tag) => {
    setCollapsedTags((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  const mouseDownLocation = useRef(null);
  const isMouseDownGlobal = useRef(false);

  const shouldScrollToQARef = useRef(false);

  const scrollTimeoutRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const lastScrollY = useRef(0);
  const isAutoScrolling = useRef(false);
  const mainRef = useRef(null);

  useEffect(() => {
    const handleScroll = (e) => {
      const currentScrollY = e.target.scrollTop;

      if (currentScrollY < 50) {
        setIsMobileNavVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (isAutoScrolling.current) {
        lastScrollY.current = currentScrollY;

        if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = setTimeout(() => {
          isAutoScrolling.current = false;
        }, 100);

        return;
      }

      if (currentScrollY < lastScrollY.current - 5) {
        setIsMobileNavVisible(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsMobileNavVisible(false);
        }, 4000);
      } else if (currentScrollY > lastScrollY.current + 5) {
        setIsMobileNavVisible(false);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      }

      lastScrollY.current = currentScrollY;
    };

    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsMobileNavVisible(false);
    }, 4000);

    return () => {
      if (mainEl) mainEl.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // --- Effects: Initialization & Auto Save ---
  useEffect(() => {
    const savedSettingsJson = localStorage.getItem(STORAGE_KEY_SETTINGS);
    let initialSettings = {
      autoSave: false,
      writingStyle: "",
      checkNgWords: true,
      showChecksInList: false,
      keepInstruction: "clear_on_success",
      showPromptMode: false,
      showModelName: false,
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
      const savedActivityLog = localStorage.getItem(STORAGE_KEY_ACTIVITY_LOG);
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

          const hasLoadedData =
            migratedEntries.length > 0 ||
            loadedDrafts.length > 0 ||
            Object.keys(loadedCompanyData).length > 0;

          if (hasLoadedData) {
            updateTutorialProgress({
              hasClickedNewEntry: true,
              hasSeenFormTutorial: true,
              hasCreatedFirstData: true,
              hasSeenFeatureUnlockTooltip: true,
            });
            setShowFeatureUnlockTooltip(false);
            setShowNewEntryTooltip(false);
          }

          if (parsed.activityLog) {
            setActivityLog(migrateActivityLog(parsed.activityLog));
          }
        } catch (e) {
          console.error("Failed to parse auto-saved data", e);
        }
      }

      if (savedActivityLog) {
        try {
          const parsedLog = JSON.parse(savedActivityLog);
          setActivityLog(migrateActivityLog(parsedLog));
        } catch (e) {
          console.error("Failed to parse activity log", e);
        }
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (appSettings.autoSave) {
      const coreData = { entries, drafts, companyData };
      const currentDataStr = JSON.stringify(coreData);
      const currentLogStr = JSON.stringify(activityLog);

      let shouldSaveData = false;
      let shouldSaveLog = false;

      if (lastSavedDataStr.current !== currentDataStr) {
        shouldSaveData = true;
        lastSavedDataStr.current = currentDataStr;
      }
      if (lastSavedLogStr.current !== currentLogStr) {
        shouldSaveLog = true;
        lastSavedLogStr.current = currentLogStr;
      }

      if (shouldSaveData) {
        const dataToSave = {
          ...coreData,
          activityLog,
          updatedAt: getCurrentJSTTime(),
        };
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataToSave));
      }
      if (shouldSaveLog) {
        localStorage.setItem(STORAGE_KEY_ACTIVITY_LOG, currentLogStr);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_ACTIVITY_LOG);
    }
  }, [
    entries,
    drafts,
    companyData,
    activityLog,
    appSettings.autoSave,
    isInitialized,
  ]);

  // --- Effects: Sync across tabs ---
  useEffect(() => {
    if (!isInitialized) return;

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_SETTINGS && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setAppSettings((prev) => ({ ...prev, ...newSettings }));
        } catch (error) {
          console.error("Failed to sync settings", error);
        }
        return;
      }

      if (!appSettings.autoSave) return;

      if (e.key === STORAGE_KEY_DATA && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);

          let loadedEntries = Array.isArray(parsed.entries)
            ? parsed.entries
            : [];
          let loadedDrafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
          let loadedCompanyData = parsed.companyData || {};

          if (parsed.companyUrls && !parsed.companyData) {
            Object.entries(parsed.companyUrls).forEach(([name, val]) => {
              loadedCompanyData[name] = normalizeCompanyData(val);
            });
          }

          const coreData = {
            entries: loadedEntries,
            drafts: loadedDrafts,
            companyData: loadedCompanyData,
          };
          lastSavedDataStr.current = JSON.stringify(coreData);

          setEntries(loadedEntries);
          setDrafts(loadedDrafts);
          setCompanyData(loadedCompanyData);
        } catch (error) {
          console.error("Failed to sync data", error);
        }
      }

      if (e.key === STORAGE_KEY_ACTIVITY_LOG && e.newValue) {
        try {
          lastSavedLogStr.current = e.newValue;
          const parsedLog = JSON.parse(e.newValue);
          setActivityLog(migrateActivityLog(parsedLog));
        } catch (error) {
          console.error("Failed to sync log", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isInitialized, appSettings.autoSave]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_VIEW_SETTINGS,
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  // --- Effects: BeforeUnload ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
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

      let isDraftDirty = false;
      if (view === "form" && isMemoMode && initialDraftState) {
        isDraftDirty =
          JSON.stringify(draftFormData) !== JSON.stringify(initialDraftState);
      }

      const isEditingDirty = isFormDirty || isDraftDirty;

      if (appSettings.autoSave) {
        if (!isEditingDirty) return;
      } else {
        const hasData =
          entries.length > 0 ||
          drafts.length > 0 ||
          Object.keys(companyData).length > 0;
        if (!hasData && !isEditingDirty) return;
      }

      e.preventDefault();
      const message = "データは保存されていません。リロードすると失われます。";
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    view,
    entries,
    drafts,
    companyData,
    formData,
    draftFormData,
    initialFormState,
    initialDraftState,
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
          if (shouldScrollToQARef.current) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            shouldScrollToQARef.current = false;
          }

          const activeEl = document.activeElement;
          const isAlreadyFocusedInside = element.contains(activeEl);

          if (!isAlreadyFocusedInside) {
            const questionInput = element.querySelector(
              'input[placeholder="質問内容"]',
            );
            const textarea = element.querySelector("textarea");

            if (questionInput && !questionInput.value) {
              questionInput.focus({ preventScroll: true });
            } else if (textarea) {
              textarea.focus({ preventScroll: true });
              const len = textarea.value.length;
              textarea.setSelectionRange(len, len);
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, isMemoMode, activeQAId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();

        if (
          view === "form" &&
          !isMemoMode &&
          !isSettingsOpen &&
          !isCompanyDataEditOpen
        ) {
          if (formData.company) {
            handleSaveEntry(false);
          }
        }
        return;
      }

      if (
        view === "form" &&
        !isMemoMode &&
        !isSettingsOpen &&
        !isCompanyDataEditOpen
      ) {
        if ((e.ctrlKey || e.metaKey) && e.key === "b") {
          e.preventDefault();
          setIsRefPanelOpen((prev) => !prev);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setActiveQAId(null);
          if (document.activeElement) document.activeElement.blur();
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
  const existingTags = useMemo(() => {
    const tagCounts = {};
    entries.forEach((e) => {
      if (e.qas) {
        e.qas.forEach((qa) => {
          const tArr = splitTags(qa.tags);
          tArr.forEach((t) => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          });
        });
      }
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
      .map((entry) => entry[0]);
  }, [entries]);

  const handleTagClick = (qaId, currentTags, clickedTag) => {
    const tagsArray = splitTags(currentTags);
    if (!tagsArray.includes(clickedTag)) {
      const newTags = currentTags
        ? `${currentTags}, ${clickedTag}`
        : clickedTag;
      updateQA(qaId, "tags", newTags);
    }
  };

  const scrollToTop = (behavior = "auto") => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: behavior });
    }
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

  const enrichedEntries = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      industry: companyData[entry.company]?.industry || "",
    }));
  }, [entries, companyData]);

  const processedCompanyEntries = useMemo(() => {
    let result = enrichedEntries;

    if (searchQuery) {
      const rawTerms = searchQuery
        .toLowerCase()
        .replace(/＃/g, "#")
        .split(/[\s\u3000]+/)
        .filter((t) => t.length > 0);
      const hasCharSearch = rawTerms.some((t) => t.includes("文字"));

      const tagTerms = rawTerms
        .filter((t) => t.startsWith("#"))
        .map((t) => t.slice(1));
      const positiveTerms = rawTerms.filter(
        (t) => !t.startsWith("-") && !t.startsWith("#"),
      );
      const negativeTerms = rawTerms
        .filter((t) => t.startsWith("-"))
        .map((t) => t.slice(1));

      result = enrichedEntries
        .map((entry) => {
          const entryBaseText =
            `${entry.company} ${entry.industry} ${entry.selectionType} ${entry.status || ""}`.toLowerCase();

          const filteredQAs = (entry.qas || []).filter((qa) => {
            const tagsArr = Array.isArray(qa.tags)
              ? qa.tags
              : splitTags(qa.tags || "");

            const hasAllTags = tagTerms.every((term) =>
              tagsArr.some((tag) => tag.toLowerCase().includes(term)),
            );
            if (!hasAllTags) return false;

            const charLimitText =
              hasCharSearch && qa.charLimit ? `${qa.charLimit}文字` : "";
            const combinedText = [
              entryBaseText,
              qa.question,
              qa.answer,
              tagsArr.join(" "),
              charLimitText,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            const isMatch = positiveTerms.every((term) =>
              combinedText.includes(term),
            );
            const isNotExcluded = negativeTerms.every(
              (term) => !combinedText.includes(term),
            );

            return isMatch && isNotExcluded;
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
  }, [enrichedEntries, searchQuery]);

  const flattenedQAs = useMemo(() => {
    let allItems = [];
    const rawTerms = searchQuery
      .toLowerCase()
      .replace(/＃/g, "#")
      .split(/[\s\u3000]+/)
      .filter((t) => t.length > 0);
    const hasCharSearch = rawTerms.some((t) => t.includes("文字"));

    const tagTerms = rawTerms
      .filter((t) => t.startsWith("#"))
      .map((t) => t.slice(1));
    const positiveTerms = rawTerms.filter(
      (t) => !t.startsWith("-") && !t.startsWith("#"),
    );
    const negativeTerms = rawTerms
      .filter((t) => t.startsWith("-"))
      .map((t) => t.slice(1));

    enrichedEntries.forEach((entry) => {
      if (entry.qas) {
        entry.qas.forEach((qa) => {
          const tags = splitTags(qa.tags);

          const hasAllTags = tagTerms.every((term) =>
            tags.some((tag) => tag.toLowerCase().includes(term)),
          );
          if (!hasAllTags) return;

          const fullContext = [
            entry.company,
            entry.industry,
            entry.selectionType,
            entry.status,
            qa.question,
            qa.answer,
            tags.join(" "),
            hasCharSearch && qa.charLimit ? `${qa.charLimit}文字` : "",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const isMatch = positiveTerms.every((term) =>
            fullContext.includes(term),
          );
          const isNotExcluded = negativeTerms.every(
            (term) => !fullContext.includes(term),
          );

          if (isMatch && isNotExcluded) {
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
  }, [enrichedEntries, searchQuery]);

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
          "編集中のメモは保存されていません。\n一覧画面に戻るとデータは失われますが、よろしいですか？",
        );
        if (!isConfirmed) return;
      }
      setViewMode("drafts");
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
          "編集中のデータは保存されていません。\n一覧画面に戻るとデータは失われますが、よろしいですか？",
        );
        if (!isConfirmed) return;
      }
      resetForm(behavior);
    } else {
      resetForm(behavior);
    }
  };

  const handleLogoClick = () => {
    if (view === "list") {
      if (appSettings.autoSave) {
        window.location.reload();
      } else {
        handleCancel("smooth");
      }
    } else {
      handleCancel("auto");
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

    if (!tutorialProgress.hasCreatedFirstMemo) {
      updateTutorialProgress({ hasCreatedFirstMemo: true });
      setShowMemoTooltip(true);
    }

    setToast("保存しました");
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

      const nowUpdatedAt = getCurrentJSTTime();
      const oldEntry = entries.find((e) => e.id === currentId);
      const oldHourKey = oldEntry?.updatedAt?.substring(0, 13) || null;
      const newHourKey = nowUpdatedAt.substring(0, 13);
      const newUpdatedAtDate = formatDateKey(new Date(nowUpdatedAt));

      let shouldBumpTimestamp = true;
      try {
        if (initialFormState && formData) {
          const normalizeForCompare = (fd) => {
            const {
              company,
              status,
              selectionType,
              deadline,
              note,
              qas,
              ...rest
            } = fd;
            return {
              ...rest,
              qas: Array.isArray(qas)
                ? qas.map(({ id, tags, ...qaRest }) => ({ ...qaRest }))
                : [],
            };
          };

          const currentComparable = JSON.stringify(
            normalizeForCompare(formData),
          );
          const initialComparable = JSON.stringify(
            normalizeForCompare(initialFormState),
          );
          if (currentComparable === initialComparable) {
            shouldBumpTimestamp = false;
          }
        }
      } catch (e) {
        console.warn("Comparison for metadata-only change failed", e);
      }

      const entryData = {
        ...formData,
        id: currentId,
        company: newCompany,
        updatedAt: shouldBumpTimestamp
          ? nowUpdatedAt
          : oldEntry?.updatedAt || formData.updatedAt || getCurrentJSTTime(),
      };

      const completedStatuses = new Set(["提出済", "採用", "不採用"]);
      const oldStatusIsCompleted =
        oldEntry && completedStatuses.has(oldEntry.status);
      const newStatusIsCompleted = completedStatuses.has(entryData.status);
      if (oldStatusIsCompleted && !newStatusIsCompleted) {
        entryData.completedAt = null;
      }

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

      if (shouldBumpTimestamp && (!oldEntry || oldHourKey !== newHourKey)) {
        setActivityLog((prev) => {
          const next = { ...prev };
          const day = newUpdatedAtDate;
          const dObj = next[day] ? { ...next[day] } : { total: 0, hourly: {} };

          dObj.total = (dObj.total || 0) + 1;

          try {
            const h = nowUpdatedAt.split("T")[1].split(":")[0];
            dObj.hourly = { ...(dObj.hourly || {}) };
            dObj.hourly[h] = (dObj.hourly[h] || 0) + 1;
          } catch (e) {
            console.warn("Time parsing failed", e);
          }

          next[day] = dObj;
          return next;
        });
      }

      setToast("保存しました");
      setTimeout(() => setToast(null), 3000);

      if (closeAfterSave) {
        resetForm();
      } else {
        setEditingId(currentId);
        const newFormState = { ...entryData };
        setFormData(newFormState);
        setInitialFormState(JSON.parse(JSON.stringify(newFormState)));
      }
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました。");
    }
  };

  const handleDelete = (id) => {
    const isDraft = id.toString().startsWith("draft_");
    if (isDraft) {
      if (!confirm("このメモを削除しますか？\n(この操作は取り消せません。)"))
        return;
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (isMemoMode) resetForm();
    } else {
      if (
        !confirm(
          "この企業のエントリーシートを削除しますか？\n(企業データは残ります)",
        )
      )
        return;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleDeleteCompanyData = (companyName) => {
    if (
      confirm(
        `${companyName}のデータを削除しますか？\n(この操作は取り消せません。)`,
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
        completedAt: fullEntry.completedAt || null,
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
        shouldScrollToQARef.current = true;
      } else {
        setActiveQAId(null);
      }
    }
    scrollToTop();
  };

  const handleEditById = (entryId, qaId = null) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) startEdit(entry, qaId);
  };

  const handleCloseTooltip = (e) => {
    e.stopPropagation();
    setShowNewEntryTooltip(false);
    updateTutorialProgress({ hasClickedNewEntry: true });
  };

  const startNewEntry = (initialDeadline = "") => {
    if (showNewEntryTooltip) {
      setShowNewEntryTooltip(false);
      updateTutorialProgress({ hasClickedNewEntry: true });
    }

    if (!tutorialProgress.hasSeenFormTutorial) {
      setFormTutorialStep(1);
    }

    resetForm();
    setIsMemoMode(false);
    const newId = Date.now();
    const newState = {
      ...DEFAULT_FORM_DATA,
      deadline:
        typeof initialDeadline === "string" && initialDeadline
          ? `${initialDeadline}T23:59`
          : "",
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

  const handleNavInteractionStart = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setIsMobileNavVisible(true);
  };

  const handleNavInteractionEnd = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsMobileNavVisible(false);
    }, 4000);
  };

  const mobileNavEventHandlers = {
    onMouseEnter: handleNavInteractionStart,
    onTouchStart: handleNavInteractionStart,
    onMouseLeave: handleNavInteractionEnd,
    onTouchEnd: handleNavInteractionEnd,
  };

  // --- Handlers: File IO ---
  const handleExport = async (e) => {
    const exportData = {
      entries: entries,
      drafts: drafts,
      companyData: companyData,
      activityLog: activityLog,
      exportedAt: getCurrentJSTTime(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);

    if ((e?.ctrlKey || e?.metaKey) && window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "es-data.json",
          types: [
            {
              description: "JSON File",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();

        return;
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
        return;
      }
    }

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const jstNowStr = getCurrentJSTTime();
    const fileNameTime = jstNowStr.split("+")[0].replace(/[:T]/g, "-");
    const fileName = `es-data-${fileNameTime}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
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
            "現在のデータを破棄して、ファイルを読み込みますか？\n(未保存のデータは失われます)",
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

          if (
            importedJson &&
            importedJson.activityLog &&
            typeof importedJson.activityLog === "object"
          ) {
            try {
              setActivityLog(
                migrateActivityLog(importedJson.activityLog || {}),
              );
            } catch (e) {
              console.error("Failed to load activityLog from import", e);
            }
          } else {
            setActivityLog({});
          }

          updateTutorialProgress({
            hasSeenWelcome: true,
            hasClickedNewEntry: true,
            hasSeenFormTutorial: true,
            hasCreatedFirstData: true,
            hasSeenFeatureUnlockTooltip: true,
          });
          setIsWelcomeModalOpen(false);
          setShowNewEntryTooltip(false);
          setShowFeatureUnlockTooltip(false);
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

  const insertQA = (index) => {
    const newId = Date.now();
    setFormData((p) => {
      const newQas = [...p.qas];
      newQas.splice(index, 0, {
        id: newId,
        question: "",
        answer: "",
        tags: "",
        charLimit: "",
        note: "",
      });
      return { ...p, qas: newQas };
    });
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

  const hasData =
    entries.length > 0 ||
    drafts.length > 0 ||
    Object.keys(companyData).length > 0;

  const showAllFeatures = hasData || tutorialProgress.hasCreatedFirstData;

  useEffect(() => {
    if (
      view === "list" &&
      hasData &&
      (!tutorialProgress.hasClickedNewEntry ||
        !tutorialProgress.hasCreatedFirstData)
    ) {
      updateTutorialProgress({
        hasClickedNewEntry: true,
        hasSeenFormTutorial: true,
        hasCreatedFirstData: true,
      });
      setShowNewEntryTooltip(false);
      if (!tutorialProgress.hasSeenFeatureUnlockTooltip) {
        setShowFeatureUnlockTooltip(true);
      }
    }
  }, [
    view,
    hasData,
    tutorialProgress.hasClickedNewEntry,
    tutorialProgress.hasCreatedFirstData,
    tutorialProgress.hasSeenFeatureUnlockTooltip,
  ]);

  // --- Render ---
  return (
    <div
      className="h-full bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden"
      onMouseDown={(e) => {
        isMouseDownGlobal.current = true;
        const isIgnoredArea = e.target.closest(
          'header, .fixed, [id^="qa-item-"]',
        );
        mouseDownLocation.current = isIgnoredArea ? "ignore" : "outside";
      }}
      onMouseUp={(e) => {
        isMouseDownGlobal.current = false;
        const isIgnoredArea = e.target.closest(
          'header, .fixed, [id^="qa-item-"]',
        );
        const upLocation = isIgnoredArea ? "ignore" : "outside";

        if (
          mouseDownLocation.current === "outside" &&
          upLocation === "outside"
        ) {
          setActiveQAId(null);
        }
      }}
    >
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm shrink-0 relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleLogoClick}
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
                title="参照パネルを切り替える (Ctrl+B)"
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
                {showAllFeatures && (
                  <button
                    onClick={startNewMemo}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg sm:px-4 flex items-center gap-1.5 shadow-md transition-all active:scale-95 ml-2 shrink-0"
                  >
                    <StickyNote size={18} />
                    <span className="hidden md:inline font-medium">
                      メモ作成
                    </span>
                  </button>
                )}

                <div className="relative flex items-center">
                  <button
                    onClick={startNewEntry}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg sm:px-4 flex items-center gap-1.5 shadow-md transition-all active:scale-95 ml-1 shrink-0 relative z-10"
                  >
                    <Plus size={18} />
                    <span className="hidden md:inline font-medium">
                      新規作成
                    </span>
                  </button>

                  {showNewEntryTooltip && (
                    <div className="absolute top-full right-0 mt-3.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-500 cursor-default">
                      <div className="absolute -top-2 right-[9px] sm:right-10 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>

                      <button
                        onClick={handleCloseTooltip}
                        className="absolute top-2 right-2 z-20 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                      >
                        <X size={14} />
                      </button>

                      <div className="relative z-10 pr-3 pt-0.5">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">
                          最初のESを作成してみましょう！
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
                  title="参照パネルを切り替える (Ctrl+B)"
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

            {showAllFeatures && (
              <>
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

                <button
                  onClick={() => {
                    setViewMode("calendar");
                    scrollToTop("smooth");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                    viewMode === "calendar"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Calendar size={14} />
                  カレンダー
                </button>

                <button
                  onClick={() => {
                    setViewMode("statistics");
                    scrollToTop("smooth");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                    viewMode === "statistics"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <BarChart3 size={14} />
                  統計・分析
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        <main
          ref={mainRef}
          className={`flex-1 overflow-y-auto overscroll-y-contain bg-slate-50 p-4 sm:p-6 transition-all duration-300 ease-in-out ${
            isRefPanelOpen && !isMemoMode ? "mr-0 lg:mr-96" : "mr-0"
          }`}
        >
          <div className="max-w-5xl mx-auto">
            {view === "list" ? (
              <div className="space-y-8">
                {/* View: Drafts */}
                {viewMode === "drafts" && drafts.length > 0 && (
                  <div className="space-y-6">
                    {(() => {
                      const filteredDrafts = drafts.filter((draft) => {
                        if (!searchQuery) return true;

                        const terms = searchQuery
                          .toLowerCase()
                          .split(/[\s\u3000]+/)
                          .filter((t) => t.length > 0);
                        const positiveTerms = terms.filter(
                          (t) => !t.startsWith("-"),
                        );
                        const negativeTerms = terms
                          .filter((t) => t.startsWith("-"))
                          .map((t) => t.slice(1));

                        const text = [
                          draft.title,
                          ...(draft.items || []).flatMap((item) => [
                            item.question,
                            item.answer,
                          ]),
                        ]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase();

                        const isMatch = positiveTerms.every((term) =>
                          text.includes(term),
                        );
                        const isNotExcluded = negativeTerms.every(
                          (term) => !text.includes(term),
                        );

                        return isMatch && isNotExcluded;
                      });

                      if (filteredDrafts.length === 0) {
                        return (
                          <div className="text-center text-slate-400 py-10">
                            該当するメモがありません
                          </div>
                        );
                      }

                      return filteredDrafts.map((draft, index) => (
                        <div key={draft.id} className="relative">
                          <DraftDisplay
                            draft={draft}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                            highlight={searchQuery}
                            appSettings={appSettings}
                          />
                          {index === 0 && showMemoTooltip && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-500 cursor-default">
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
                              <button
                                onClick={handleCloseMemoTooltip}
                                className="absolute top-2 right-2 z-20 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                              >
                                <X size={14} />
                              </button>
                              <div className="relative z-10 pr-4 pt-0.5">
                                <p className="text-sm font-bold text-slate-700 leading-relaxed text-center whitespace-nowrap">
                                  メモはエントリーシートとは別に保存されます！
                                  <br />
                                  左上の「メモ」タブからいつでも確認や編集ができます。
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* View: Company Group */}
                {viewMode === "company" && (
                  <div className="space-y-6">
                    {processedCompanyEntries.length === 0 && (
                      <div className="text-center text-slate-400 py-10">
                        エントリーシートがありません。
                        <br />
                        新規作成するか、右上のアップロードボタンからJSONを読み込んでください。
                      </div>
                    )}
                    {processedCompanyEntries.map((entry, index) => {
                      const cData = companyData[entry.company] || {};
                      return (
                        <div key={entry.id} className="relative">
                          <ESEntryDisplay
                            entry={{ ...entry, industry: cData.industry }}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                            companyUrl={cData.myPageUrl}
                            highlight={searchQuery}
                            appSettings={appSettings}
                          />
                          {index === 0 && showFeatureUnlockTooltip && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-500 cursor-default">
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
                              <button
                                onClick={handleCloseFeatureUnlockTooltip}
                                className="absolute top-2 right-2 z-20 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                              >
                                <X size={14} />
                              </button>
                              <div className="relative z-10 pr-4 pt-0.5">
                                <p className="text-sm font-bold text-slate-700 leading-relaxed text-center whitespace-nowrap">
                                  素晴らしいです！
                                  <br />
                                  この画面で確認できるようになりました！
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* View: Status Group */}
                {viewMode === "status" && (
                  <div className="relative">
                    {Object.keys(entriesByStatus).length > 0 && (
                      <div
                        {...mobileNavEventHandlers}
                        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95%] sm:max-w-2xl transition-all duration-500 ease-in-out sm:duration-150 ${
                          isMobileNavVisible
                            ? "translate-y-0 opacity-100 pointer-events-auto"
                            : "translate-y-8 opacity-0 pointer-events-none"
                        } sm:translate-y-0 sm:opacity-30 sm:hover:opacity-100 sm:pointer-events-auto`}
                      >
                        <div className="p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-start gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {["未提出", "作成中", "提出済", "採用", "不採用"]
                              .concat(
                                Object.keys(entriesByStatus).filter(
                                  (s) =>
                                    ![
                                      "未提出",
                                      "作成中",
                                      "提出済",
                                      "採用",
                                      "不採用",
                                    ].includes(s),
                                ),
                              )
                              .map((status, _, array) => {
                                const count = entriesByStatus[status]?.length;
                                if (!count) return null;

                                const isFirst =
                                  array.find(
                                    (s) => entriesByStatus[s]?.length > 0,
                                  ) === status;

                                return (
                                  <button
                                    key={`nav-${status}`}
                                    onClick={() => {
                                      isAutoScrolling.current = true;
                                      setIsMobileNavVisible(true);

                                      if (isFirst) {
                                        scrollToTop("smooth");
                                      } else {
                                        const el = document.getElementById(
                                          `status-section-${status}`,
                                        );
                                        if (el && mainRef.current) {
                                          const mainEl = mainRef.current;
                                          const y =
                                            el.getBoundingClientRect().top -
                                            mainEl.getBoundingClientRect().top +
                                            mainEl.scrollTop -
                                            20;
                                          mainEl.scrollTo({
                                            top: y,
                                            behavior: "smooth",
                                          });
                                        }
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-slate-600 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 group"
                                  >
                                    {status}
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {Object.keys(entriesByStatus).length === 0 && (
                      <div className="text-center text-slate-400 py-10">
                        データはありません
                      </div>
                    )}
                    {["未提出", "作成中", "提出済", "採用", "不採用"].map(
                      (status) => {
                        const entries = entriesByStatus[status];
                        if (!entries || entries.length === 0) return null;
                        const isCollapsed = collapsedStatuses[status];
                        return (
                          <div
                            key={status}
                            id={`status-section-${status}`}
                            className={`bg-slate-50/50 rounded-xl border border-slate-200 scroll-mt-40 sm:scroll-mt-32 transition-all duration-300 ease-in-out px-4 last:mb-0 ${
                              !isCollapsed ? "py-4 mb-8" : "py-3 mb-3"
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between transition-[margin] duration-300 ease-in-out ${!isCollapsed ? "mb-4" : "mb-0"}`}
                            >
                              <div className="flex items-center gap-2">
                                <StatusBadge status={status} />
                                <span className="text-xs text-slate-400 font-bold">
                                  {entries.length}社
                                </span>
                              </div>
                              <button
                                onClick={() => toggleStatusCollapse(status)}
                                className="text-slate-400 hover:text-slate-600 px-1 transition-transform"
                              >
                                {isCollapsed ? (
                                  <ChevronDown size={18} />
                                ) : (
                                  <ChevronUp size={18} />
                                )}
                              </button>
                            </div>
                            <div
                              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                                !isCollapsed
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0"
                              }`}
                            >
                              <div className="overflow-hidden space-y-6">
                                {entries.map((entry) => {
                                  const cData =
                                    companyData[entry.company] || {};
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
                      .map((status) => {
                        const entries = entriesByStatus[status];
                        const isCollapsed = collapsedStatuses[status];
                        return (
                          <div
                            key={status}
                            id={`status-section-${status}`}
                            className={`bg-slate-50/50 rounded-xl border border-slate-200 scroll-mt-40 sm:scroll-mt-32 transition-all duration-300 ease-in-out px-4 last:mb-0 ${
                              !isCollapsed ? "py-4 mb-8" : "py-3 mb-3"
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between transition-[margin] duration-300 ease-in-out ${!isCollapsed ? "mb-4" : "mb-0"}`}
                            >
                              <h3 className="text-sm font-bold text-slate-600 px-1 flex items-center gap-2">
                                {status}
                                <span className="text-xs text-slate-400 font-normal">
                                  {entries.length}社
                                </span>
                              </h3>
                              <button
                                onClick={() => toggleStatusCollapse(status)}
                                className="text-slate-400 hover:text-slate-600 px-1 transition-transform"
                              >
                                {isCollapsed ? (
                                  <ChevronDown size={18} />
                                ) : (
                                  <ChevronUp size={18} />
                                )}
                              </button>
                            </div>
                            {!isCollapsed && (
                              <div className="space-y-6">
                                {entries.map((entry) => {
                                  const cData =
                                    companyData[entry.company] || {};
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
                                      appSettings={appSettings}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* View: Question Group */}
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
                  <div className="relative">
                    {Object.keys(tagGroups).length > 0 && (
                      <div
                        {...mobileNavEventHandlers}
                        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95%] sm:max-w-2xl transition-all duration-500 ease-in-out sm:duration-150 ${
                          isMobileNavVisible
                            ? "translate-y-0 opacity-100 pointer-events-auto"
                            : "translate-y-8 opacity-0 pointer-events-none"
                        } sm:translate-y-0 sm:opacity-30 sm:hover:opacity-100 sm:pointer-events-auto`}
                      >
                        <div className="p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-start gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {Object.keys(tagGroups).map((tagName, _, array) => {
                              const count = tagGroups[tagName]?.length;
                              if (!count) return null;

                              const isFirst = array[0] === tagName;

                              return (
                                <button
                                  key={`nav-${tagName}`}
                                  onClick={() => {
                                    isAutoScrolling.current = true;
                                    setIsMobileNavVisible(true);

                                    if (isFirst) {
                                      scrollToTop("smooth");
                                    } else {
                                      const el = document.getElementById(
                                        `tag-section-${tagName}`,
                                      );
                                      if (el && mainRef.current) {
                                        const mainEl = mainRef.current;
                                        const y =
                                          el.getBoundingClientRect().top -
                                          mainEl.getBoundingClientRect().top +
                                          mainEl.scrollTop -
                                          20;
                                        mainEl.scrollTo({
                                          top: y,
                                          behavior: "smooth",
                                        });
                                      }
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-slate-600 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 group"
                                >
                                  #{tagName}
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {Object.keys(tagGroups).length === 0 && (
                      <div className="text-center text-slate-400 py-10">
                        タグ付けされた質問はありません
                      </div>
                    )}
                    {Object.entries(tagGroups).map(([tagName, items]) => {
                      const isCollapsed = collapsedTags[tagName];
                      return (
                        <div
                          key={tagName}
                          id={`tag-section-${tagName}`}
                          className={`bg-slate-50/50 rounded-xl border border-slate-200 scroll-mt-40 sm:scroll-mt-32 transition-all duration-300 ease-in-out px-4 last:mb-0 ${
                            !isCollapsed ? "py-4 mb-8" : "py-3 mb-3"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between transition-[margin] duration-300 ease-in-out ${!isCollapsed ? "mb-4" : "mb-0"}`}
                          >
                            <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                              <Tags size={16} /> #{tagName}
                              <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                                {items.length}
                              </span>
                            </h3>
                            <button
                              onClick={() => toggleTagCollapse(tagName)}
                              className="text-slate-400 hover:text-slate-600 px-1 transition-transform"
                            >
                              {isCollapsed ? (
                                <ChevronDown size={18} />
                              ) : (
                                <ChevronUp size={18} />
                              )}
                            </button>
                          </div>
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                              !isCollapsed
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
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
                          </div>
                        </div>
                      );
                    })}
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
                              className="fixed inset-0 z-30"
                              onClick={() => setIsColumnSelectorOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-40 p-2 animate-in fade-in zoom-in-95 duration-200">
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

                    {!tutorialProgress.hasSeenCompanyDataTutorial && (
                      <div className="m-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative animate-in slide-in-from-top-2">
                        <button
                          onClick={() =>
                            updateTutorialProgress({
                              hasSeenCompanyDataTutorial: true,
                            })
                          }
                          className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                        <div className="flex gap-3">
                          <div className="mt-0.5 text-indigo-600 shrink-0">
                            <Info size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-900 mb-1">
                              ここでは企業データを管理することができます
                            </h4>
                            <p className="text-xs text-indigo-700 leading-relaxed">
                              ES作成時に自動で追加され、企業の詳細な情報は編集ボタンで選択して変更することができます。
                              <br />
                              次回以降はここに登録されている企業名をESに入力することで、企業データを紐づけることができます。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                                        href={getSafariUrl(data.myPageUrl)}
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
                                        href={getSafariUrl(data.recruitmentUrl)}
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

                {/* View: Calendar */}
                {viewMode === "calendar" && (
                  <CalendarView
                    entries={processedCompanyEntries}
                    onEdit={startEdit}
                    onAdd={startNewEntry}
                  />
                )}

                {/* View: Statistics */}
                {viewMode === "statistics" && (
                  <StatisticsView
                    entries={entries}
                    companyData={companyData}
                    activityLog={activityLog}
                  />
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
                      title="保存 (Ctrl+S)"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Save size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div
                      data-tutorial="1"
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 min-w-0 transition-all duration-500 ${formTutorialStep === 1 ? "relative z-[101] bg-white p-4 rounded-xl shadow-lg pointer-events-none -mx-4" : ""}`}
                    >
                      <div>
                        <label className="text-xs font-bold text-slate-500">
                          企業名 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <style>{`
                            #company-input::-webkit-calendar-picker-indicator {
                              display: none !important;
                            }
                          `}</style>
                          <input
                            id="company-input"
                            className="w-full pl-3 pr-16 py-2 border rounded-lg outline-none focus:border-indigo-500"
                            value={formData.company}
                            autoFocus={!editingId && formTutorialStep !== 1}
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
                            placeholder="例: 〇〇株式会社"
                            list="es-company-suggestions"
                          />
                          <datalist id="es-company-suggestions">
                            {companyNames
                              .filter((name) => name !== formData.company)
                              .map((name) => (
                                <option key={name} value={name} />
                              ))}
                          </datalist>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                            {formData.recruitmentUrl && (
                              <a
                                href={getSafariUrl(formData.recruitmentUrl)}
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
                                href={getSafariUrl(formData.myPageUrl)}
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
                              placeholder="例: IT、営業"
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
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const completedStatuses = new Set([
                              "提出済",
                              "採用",
                              "不採用",
                            ]);
                            const currentIsCompleted = completedStatuses.has(
                              formData.status,
                            );
                            const newIsCompleted =
                              completedStatuses.has(newStatus);

                            if (currentIsCompleted && !newIsCompleted) {
                              if (window.confirm("提出を取り消しますか？")) {
                                setFormData({ ...formData, status: newStatus });
                              }
                            } else {
                              setFormData({ ...formData, status: newStatus });
                            }
                          }}
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
                      <div className="min-w-0">
                        <label className="text-xs font-bold text-slate-500">
                          提出期限
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full min-w-0 max-w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-indigo-500"
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
                      <div className="space-y-6 relative">
                        {formData.qas.map((qa, idx) => {
                          const isActive =
                            activeQAId === qa.id ||
                            (formTutorialStep === 2 && idx === 0);

                          return (
                            <div
                              key={qa.id}
                              id={`qa-item-${qa.id}`}
                              data-tutorial={idx === 0 ? "2" : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQAId(qa.id);
                              }}
                              className={`relative rounded-xl border transition-all duration-500 ease-in-out px-4 pt-2 pb-3 ${
                                activeTagDropdownId === qa.id ? "z-40" : "z-10"
                              } ${
                                isActive
                                  ? "bg-slate-50 shadow-sm border-indigo-200 ring-1 ring-indigo-200"
                                  : `bg-white border-slate-200 hover:border-indigo-300 cursor-pointer hover:opacity-100 ${
                                      activeTagDropdownId === qa.id
                                        ? "opacity-100"
                                        : "opacity-90"
                                    }`
                              } ${
                                formTutorialStep === 2 && idx === 0
                                  ? "z-[101] bg-white shadow-lg pointer-events-none"
                                  : ""
                              }`}
                            >
                              {idx === 0 && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertQA(0);
                                  }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 w-1/3 h-6 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50 cursor-pointer group/insert"
                                >
                                  <div className="w-full h-0.5 bg-indigo-400 relative flex items-center justify-center group-hover/insert:h-1 group-hover/insert:bg-indigo-500 transition-all">
                                    <div className="bg-indigo-500 text-white rounded-full p-0.5 absolute shadow-sm transform group-hover/insert:scale-110 transition-transform">
                                      <Plus size={14} />
                                    </div>
                                  </div>
                                </div>
                              )}

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
                                  className={`flex items-center gap-3 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 ml-auto ${
                                    formTutorialStep > 0
                                      ? "pointer-events-none"
                                      : "pointer-events-auto"
                                  } ${
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
                                      id={`charLimit-input-${qa.id}`}
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
                                    onFocus={() => {
                                      if (!isMouseDownGlobal.current)
                                        setActiveQAId(qa.id);
                                    }}
                                    onChange={(e) =>
                                      updateQA(
                                        qa.id,
                                        "question",
                                        e.target.value,
                                      )
                                    }
                                    autoFocus={isActive && !qa.question}
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
                                  onFocus={() => {
                                    if (!isMouseDownGlobal.current)
                                      setActiveQAId(qa.id);
                                  }}
                                  placeholder="回答"
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
                                  </div>
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
                                  allEntries={enrichedEntries}
                                  entryId={editingId}
                                  qaId={qa.id}
                                  writingStyle={appSettings.writingStyle}
                                  keepInstruction={appSettings.keepInstruction}
                                  showPromptMode={appSettings.showPromptMode}
                                  showModelName={appSettings.showModelName}
                                  isActive={isActive}
                                  appSettings={appSettings}
                                />
                              </div>

                              <div
                                className={`relative transition-all duration-300 ease-in-out ${isActive ? "mt-2" : "mt-3"}`}
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <input
                                    className={`flex-1 transition-all duration-300 ease-in-out bg-white border border-slate-200 outline-none focus:border-indigo-500 placeholder-slate-300 ${
                                      isActive
                                        ? "text-xs px-3 py-2 rounded-md"
                                        : "text-xs px-2 py-1 rounded"
                                    }`}
                                    placeholder="タグ (例: 自己PR、ガクチカ)"
                                    value={qa.tags}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={() => {
                                      setActiveTagDropdownId(qa.id);
                                    }}
                                    onBlur={() => setActiveTagDropdownId(null)}
                                    onChange={(e) =>
                                      updateQA(qa.id, "tags", e.target.value)
                                    }
                                  />
                                  <div
                                    className={`flex items-center justify-end overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
                                      isActive
                                        ? "max-w-0 opacity-0"
                                        : "max-w-[150px] opacity-100"
                                    }`}
                                  >
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveQAId(qa.id);
                                        setTimeout(() => {
                                          const inputEl =
                                            document.getElementById(
                                              `charLimit-input-${qa.id}`,
                                            );
                                          if (inputEl) {
                                            inputEl.focus();
                                            inputEl.select();
                                          }
                                        }, 100);
                                      }}
                                      className={`text-right text-[10px] font-mono whitespace-nowrap cursor-pointer hover:text-indigo-500 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors ${
                                        qa.charLimit &&
                                        qa.answer.length > Number(qa.charLimit)
                                          ? "text-rose-500 font-bold"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {qa.answer.length}文字
                                      {qa.charLimit &&
                                        ` / 上限: ${qa.charLimit}`}
                                    </div>
                                  </div>
                                </div>
                                {activeTagDropdownId === qa.id &&
                                  (() => {
                                    const currentTags = splitTags(qa.tags);
                                    const availableTags = existingTags.filter(
                                      (t) => !currentTags.includes(t),
                                    );
                                    if (availableTags.length === 0) return null;
                                    return (
                                      <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg p-3 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95">
                                        <div className="w-full text-[10px] font-bold text-slate-400 mb-1 border-b border-slate-100 pb-1">
                                          過去に利用したタグ
                                        </div>
                                        {availableTags.map((tag) => (
                                          <button
                                            key={tag}
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTagClick(
                                                qa.id,
                                                qa.tags,
                                                tag,
                                              );
                                            }}
                                            className="text-[10px] px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm"
                                          >
                                            {tag}
                                          </button>
                                        ))}
                                      </div>
                                    );
                                  })()}
                              </div>

                              {idx !== formData.qas.length - 1 && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertQA(idx + 1);
                                  }}
                                  className="absolute top-full left-1/2 -translate-x-1/2 w-1/3 h-6 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50 cursor-pointer group/insert"
                                >
                                  <div className="w-full h-0.5 bg-indigo-400 relative flex items-center justify-center group-hover/insert:h-1 group-hover/insert:bg-indigo-500 transition-all">
                                    <div className="bg-indigo-500 text-white rounded-full p-0.5 absolute shadow-sm transform group-hover/insert:scale-110 transition-transform">
                                      <Plus size={14} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        data-tutorial="3"
                        onClick={(e) => {
                          e.stopPropagation();
                          addQA();
                        }}
                        className={`mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 text-sm font-bold transition-all duration-500 ${
                          formTutorialStep === 3
                            ? "relative z-[101] bg-white shadow-lg pointer-events-none"
                            : ""
                        }`}
                      >
                        <Plus size={16} /> 質問を追加
                      </button>
                    </div>

                    <div
                      data-tutorial="4"
                      className={`flex justify-end gap-3 pt-4 border-t transition-all duration-500 ${
                        formTutorialStep === 4
                          ? "relative z-[101] bg-white p-4 rounded-xl shadow-lg pointer-events-none -mx-4 -mb-4"
                          : ""
                      }`}
                    >
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
          entries={enrichedEntries}
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

      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
      />

      {formTutorialStep > 0 && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 animate-in fade-in duration-300" />

          <div className="fixed inset-0 z-[102] flex justify-center pointer-events-none">
            <div
              className={`w-full max-w-sm mx-4 absolute transition-all duration-700 ease-in-out pointer-events-auto ${
                formTutorialStep <= 2
                  ? "top-[calc(100dvh-260px)] sm:top-[calc(100dvh-280px)]"
                  : "top-24 sm:top-28"
              }`}
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-black text-indigo-600 mb-2">
                  {formTutorialContent[formTutorialStep].title}
                </h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  {formTutorialContent[formTutorialStep].text}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">
                    {formTutorialStep} / 4
                  </span>
                  <button
                    onClick={handleNextFormTutorial}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                  >
                    {formTutorialStep < 4 ? "次へ" : "さっそく取り掛かる"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
