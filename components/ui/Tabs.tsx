'use client'

import React, { useState } from 'react'

export interface Tab {
  id: string
  label: string | React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
  onTabChange?: (tabId: string) => void
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  orientation = 'horizontal',
  className = '',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }
  
  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content || null
  
  if (orientation === 'vertical') {
    return (
      <div className={`flex gap-8 ${className}`}>
        <div className="flex flex-col gap-2 border-r border-black/5 pr-8 w-48 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={`px-4 py-2 text-xs font-medium text-left border-r-2 transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-black opacity-100 text-black'
                  : 'border-transparent text-black/70 hover:text-black hover:border-black/20'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-[400px]">
          {activeTabContent}
        </div>
      </div>
    )
  }
  
  return (
    <div className={className}>
      <div className="flex gap-2 border-b border-black/10 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-black opacity-100 text-black'
                : 'border-transparent text-black/70 hover:text-black hover:border-black/20'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {activeTabContent}
      </div>
    </div>
  )
}

