"use client";

import { useState } from "react";
import { AlertTriangle, Map as MapIcon, List, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { UkraineMap } from "./ukraine-map";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  alertType?: string
  alertTypeName?: string
  startedAt?: string
  lastUpdate?: string
  alertsCount?: number
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

interface DetailedAlert {
  regionId: string
  regionName: string
  regionType: string
  oblastId?: string
  oblastName?: string
  alertType: string
  alertTypeName: string
  alertIcon: string
  startedAt?: string
  lastUpdate: string
}

interface AlertsWithMapProps {
  alerts: AlertRegion[]
  detailedAlerts?: DetailedAlert[]
  oblastsWithAlerts?: string[]
  hasActiveAlert: boolean
  alertsHasData: boolean | null
  totalAlertsCount?: number
  oblastsCount?: number
}

// Типи тривог з іконками
const ALERT_TYPE_INFO: Record<string, { name: string; icon: string; color: string }> = {
  'AIR': { name: 'Повітряна тривога', icon: '🚨', color: '#e74c3c' },
  'ARTILLERY': { name: 'Артилерійський обстріл', icon: '💥', color: '#e67e22' },
  'URBAN_FIGHTS': { name: 'Вуличні бої', icon: '⚔️', color: '#9b59b6' },
  'CHEMICAL': { name: 'Хімічна загроза', icon: '☢️', color: '#f1c40f' },
  'NUCLEAR': { name: 'Ядерна загроза', icon: '☢️', color: '#e74c3c' },
  'INFO': { name: 'Інформаційна тривога', icon: 'ℹ️', color: '#3498db' },
  'UNKNOWN': { name: 'Невідома загроза', icon: '⚠️', color: '#95a5a6' }
}

// Форматування часу
function formatTime(isoString?: string): string {
  if (!isoString) return "";
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Якщо менше години - показуємо хвилини
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "щойно";
      return `${minutes} хв тому`;
    }
    
    // Якщо менше доби - показуємо години
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} год тому`;
    }
    
    // Інакше - дата і час
    return date.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Kiev",
    });
  } catch {
    return "";
  }
}

// Групування тривог по областях
function groupAlertsByOblast(detailedAlerts: DetailedAlert[]): Map<string, DetailedAlert[]> {
  const grouped = new Map<string, DetailedAlert[]>();
  
  detailedAlerts.forEach((alert) => {
    const key = alert.oblastName || alert.regionName;
    const existing = grouped.get(key) || [];
    existing.push(alert);
    grouped.set(key, existing);
  });
  
  return grouped;
}

export function AlertsWithMap({
  alerts,
  detailedAlerts = [],
  oblastsWithAlerts = [],
  hasActiveAlert,
  alertsHasData,
  totalAlertsCount = 0,
  oblastsCount = 0,
}: AlertsWithMapProps) {
  // За замовчуванням відкриваємо вкладку "Тривоги"
  const [activeTab, setActiveTab] = useState<"map" | "details" | "alerts">("alerts");
  const [expandedOblasts, setExpandedOblasts] = useState<Set<string>>(new Set());

  const toggleOblast = (oblastName: string) => {
    setExpandedOblasts((prev) => {
      const next = new Set(prev);
      if (next.has(oblastName)) {
        next.delete(oblastName);
      } else {
        next.add(oblastName);
      }
      return next;
    });
  };

  const groupedAlerts = groupAlertsByOblast(detailedAlerts);
  
  // Сортуємо області за кількістю тривог (від більшого до меншого)
  const sortedOblasts = Array.from(groupedAlerts.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Спеціальні регіони для вкладки "Тривоги"
  const hasBuchanskyiAlert = detailedAlerts.some(
    (a) => a.regionId === "75" && a.alertType === "AIR"
  );

  const hasKyivCityAlert = detailedAlerts.some(
    (a) => a.regionId === "31" && a.alertType === "AIR"
  );

  const hasKyivOblastAlert = detailedAlerts.some(
    (a) =>
      (a.oblastId === "14" || a.regionId === "14") &&
      a.alertType === "AIR"
  );

  const renderSpecialRegionRow = (label: string, hasAlert: boolean) => (
    <div
      key={label}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        hasAlert
          ? "border-red-500/50 bg-red-500/5"
          : "border-emerald-500/40 bg-emerald-500/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            hasAlert ? "bg-red-500" : "bg-emerald-400"
          }`}
        />
        <span className="text-gray-200">{label}</span>
      </div>
      <span
        className={`font-medium ${
          hasAlert ? "text-red-400" : "text-green-400"
        }`}
      >
        {hasAlert ? "тривога" : "не має тривоги"}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle
            className={`w-6 h-6 ${hasActiveAlert ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
          />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
            {hasActiveAlert && (
              <p className="text-xs text-red-400">
                {oblastsCount} {oblastsCount === 1 ? "область" : oblastsCount < 5 ? "області" : "областей"} • {totalAlertsCount} {totalAlertsCount === 1 ? "тривога" : totalAlertsCount < 5 ? "тривоги" : "тривог"}
              </p>
            )}
          </div>
        </div>
        
        {/* Перемикач вкладок: Тривоги • Карта • Детально */}
        <div className="flex flex-wrap bg-slate-800/50 rounded-lg p-1 gap-1 max-w-[210px]">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "alerts"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Тривоги</span>
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "map"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Карта</span>
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "details"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Детально</span>
          </button>
        </div>
      </div>

      {/* Контент вкладок */}
      {activeTab === "map" ? (
        <div className="flex-1 min-h-[180px] lg:min-h-[200px] rounded-lg overflow-hidden">
          <UkraineMap alerts={alerts} oblastsWithAlerts={oblastsWithAlerts} />
        </div>
      ) : activeTab === "details" ? (
        /* Детальний перелік */
        <div className="flex-1 overflow-y-auto pr-1">
          {!hasActiveAlert ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-lg font-medium text-green-400">Наразі тривог немає</p>
              <p className="text-sm text-gray-500 mt-1">Всі області України безпечні</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedOblasts.map(([oblastName, oblastAlerts]) => {
                const isExpanded = expandedOblasts.has(oblastName);
                const hasMultipleAlerts = oblastAlerts.length > 1;
                const mainAlert = oblastAlerts[0];
                const alertInfo = ALERT_TYPE_INFO[mainAlert.alertType] || ALERT_TYPE_INFO["UNKNOWN"];
                
                // Групуємо по типах регіонів
                const oblastLevelAlerts = oblastAlerts.filter(a => a.regionType === "State");
                const districtAlerts = oblastAlerts.filter(a => a.regionType === "District");
                const communityAlerts = oblastAlerts.filter(a => a.regionType === "Community");
                
                return (
                  <div
                    key={oblastName}
                    className="bg-slate-800/50 border border-red-500/30 rounded-xl overflow-hidden"
                  >
                    {/* Заголовок області */}
                    <button
                      onClick={() => hasMultipleAlerts && toggleOblast(oblastName)}
                      className={`w-full flex items-center justify-between p-3 ${
                        hasMultipleAlerts ? "cursor-pointer hover:bg-slate-700/50" : ""
                      } transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${alertInfo.color}30` }}
                        >
                          {alertInfo.icon}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-white">{oblastName}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span style={{ color: alertInfo.color }}>{alertInfo.name}</span>
                            {mainAlert.startedAt && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(mainAlert.startedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {hasMultipleAlerts && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            +{oblastAlerts.length - 1}
                          </span>
                        )}
                        {hasMultipleAlerts && (
                          isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )
                        )}
                      </div>
                    </button>
                    
                    {/* Розширений вміст */}
                    {isExpanded && hasMultipleAlerts && (
                      <div className="border-t border-slate-700/50 bg-slate-900/30">
                        {/* Райони */}
                        {districtAlerts.length > 0 && (
                          <div className="p-3">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                              Райони ({districtAlerts.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {districtAlerts.map((alert, idx) => (
                                <div
                                  key={`${alert.regionId}-${idx}`}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                                >
                                  <span className="text-[10px]">{ALERT_TYPE_INFO[alert.alertType]?.icon || "⚠️"}</span>
                                  <span className="text-xs text-orange-300">
                                    {alert.regionName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Громади */}
                        {communityAlerts.length > 0 && (
                          <div className="p-3 border-t border-slate-700/30">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                              Громади ({communityAlerts.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {communityAlerts.map((alert, idx) => (
                                <div
                                  key={`${alert.regionId}-${idx}`}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                                >
                                  <span className="text-[10px]">{ALERT_TYPE_INFO[alert.alertType]?.icon || "⚠️"}</span>
                                  <span className="text-xs text-yellow-300">
                                    {alert.regionName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Вкладка "Тривоги" з трьома конкретними регіонами
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {renderSpecialRegionRow("Бучанський район", hasBuchanskyiAlert)}
            {renderSpecialRegionRow("м. Київ", hasKyivCityAlert)}
            {renderSpecialRegionRow("Київська область", hasKyivOblastAlert)}
          </div>
        </div>
      )}

      {/* Попередження якщо немає даних */}
      {alertsHasData === false && (
        <p className="text-xs text-yellow-400 mt-2">
          Немає даних з сервера. Оновлення...
        </p>
      )}
    </div>
  );
}
