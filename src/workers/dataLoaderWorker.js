const safeParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return { __parseError: true, message: error.message };
  }
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

self.onmessage = (event) => {
  const { savedDataJson, savedActivityLog } = event.data;

  const parsedData = safeParse(savedDataJson);
  const parsedActivityLog = safeParse(savedActivityLog);

  const result = {
    parseError: false,
    errorMessage: null,
    loadedEntries: [],
    loadedDrafts: [],
    loadedCompanyData: {},
    activityLog: {},
  };

  if (parsedData && parsedData.__parseError) {
    result.parseError = true;
    result.errorMessage = parsedData.message;
    self.postMessage({ result });
    return;
  }

  if (parsedData) {
    if (Array.isArray(parsedData.entries)) {
      result.loadedEntries = parsedData.entries;
    }
    if (Array.isArray(parsedData.drafts)) {
      result.loadedDrafts = parsedData.drafts;
    }

    if (parsedData.companyUrls) {
      Object.entries(parsedData.companyUrls).forEach(([name, val]) => {
        result.loadedCompanyData[name] = normalizeCompanyData(val);
      });
    } else if (parsedData.companyData) {
      result.loadedCompanyData = parsedData.companyData;
    }

    result.loadedEntries = result.loadedEntries.map((entry) => {
      if (entry.industry && entry.company) {
        const currentData =
          result.loadedCompanyData[entry.company] || normalizeCompanyData({});
        if (!currentData.industry) {
          currentData.industry = entry.industry;
          result.loadedCompanyData[entry.company] = currentData;
        }
        return { ...entry, industry: "" };
      }
      return entry;
    });

    if (parsedData.activityLog) {
      result.activityLog = migrateActivityLog(parsedData.activityLog);
    }
  }

  if (parsedActivityLog && !parsedActivityLog.__parseError) {
    result.activityLog = migrateActivityLog(parsedActivityLog);
  } else if (parsedActivityLog && parsedActivityLog.__parseError) {
    result.parseError = true;
    result.errorMessage = parsedActivityLog.message;
  }

  self.postMessage({ result });
};

export {};
