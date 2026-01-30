"use client"

import { useState } from "react"
import { Lightbulb, Battery } from "lucide-react"
import Dashboard from "@/components/dashboard"
import InverterDashboard from "@/components/inverter-dashboard"

type TabId = "main" | "inverter"

const TABS: { id: TabId; icon: typeof Lightbulb; color: string }[] = [
  { id: "main", icon: Lightbulb, color: "yellow" },
  { id: "inverter", icon: Battery, color: "green" },
]

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("main")

  return (
    <div className="min-h-screen flex flex-col">
      {/* Прозоре поле для динамічного острова iPhone */}
      <div className="h-[env(safe-area-inset-top,44px)] bg-transparent flex-shrink-0" />
      
      {/* Хедер з іконками */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-center gap-2 px-4 py-2.5">
          <div className="flex rounded-2xl bg-white/5 p-1 border border-white/10">
            {TABS.map(({ id, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-300 ${
                  activeTab === id
                    ? color === "yellow"
                      ? "bg-gradient-to-br from-yellow-500/50 to-yellow-600/40 text-yellow-200 shadow-lg border border-yellow-400/30"
                      : "bg-gradient-to-br from-green-500/50 to-green-600/40 text-green-200 shadow-lg border border-green-400/30"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10"
                }`}
                aria-label={id === "main" ? "Головна" : "Інвертор"}
              >
                <Icon className={`w-5 h-5 ${activeTab === id ? (color === "yellow" ? "text-yellow-300" : "text-green-300") : ""}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "main" ? <Dashboard /> : <InverterDashboard />}
    </div>
  )
}
