'use client';

import { useState } from 'react';
import { HiOutlineTrash, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

interface ChatHistory {
  id: string;
  title: string;
  timestamp: number;
}

interface SidebarProps {
  chats: ChatHistory[];
  activeChat: string;
  isOpen: boolean;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onToggle: () => void;
}

export function Sidebar({ 
  chats, 
  activeChat, 
  isOpen, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  onToggle 
}: SidebarProps) {
  return (
    <>
      {/* Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2 rounded-lg bg-[#1A1A24] border border-[#2A2A35] text-white hover:border-[#fab6f5] transition-colors"
        >
          <HiOutlineMenu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative z-40 w-72 bg-[#0A0A0F] border-r border-[#2A2A35] flex flex-col h-screen transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#2A2A35]">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-[#A0A0B0] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full py-3 px-4 rounded-xl bg-[#1A1A24] border border-[#2A2A35] text-white font-medium hover:border-[#fab6f5] transition-colors flex items-center justify-center gap-2"
          >
            <span>+</span> New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-xs text-[#606070] uppercase tracking-wider px-3 py-2">
            Recent Chats
          </div>
          
          {chats.length === 0 ? (
            <div className="px-3 py-8 text-center text-[#606070] text-sm">
              No chats yet
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div 
                  key={chat.id}
                  className={`group flex items-center gap-2 w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    activeChat === chat.id
                      ? 'bg-[#1A1A24] text-white'
                      : 'text-[#A0A0B0] hover:bg-[#12121A] hover:text-white'
                  }`}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-sm font-medium truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-[#606070] mt-1">
                      {String(new Date(chat.timestamp).getMonth() + 1).padStart(2, '0')}/{String(new Date(chat.timestamp).getDate()).padStart(2, '0')}/{new Date(chat.timestamp).getFullYear()}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="p-2 rounded-lg text-[#606070] hover:text-[#EF4444] hover:bg-[#1A1A24] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A35]">
          <div className="flex items-center gap-2 text-xs text-[#606070]">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
            LI.FI Yield Agent
          </div>
        </div>
      </aside>
    </>
  );
}
