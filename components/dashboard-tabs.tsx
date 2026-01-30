"use client"

import { useState } from "react"
import { LayoutDashboard, Battery } from "lucide-react"
import Dashboard from "@/components/dashboard"
import InverterDashboard from "@/components/inverter-dashboard"

type TabId = "main" | "inverter"

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "main", label: "Головна", icon: LayoutDashboard },
  { id: "inverter", label: "Інвертор", icon: Battery },
]

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("main")

  return (
    <div className="min-h-screen flex flex-col">
      {/* Таби — фіксовано зверху в одному стилі з дашбордом */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-2 px-4 py-3 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex rounded-2xl bg-white/5 p-1 border border-white/10">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === id
                  ? "bg-gradient-to-br from-blue-500/40 to-blue-600/30 text-white shadow-lg border border-white/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "main" ? <Dashboard /> : <InverterDashboard />}
    </div>
  )
}
