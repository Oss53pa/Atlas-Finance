import React, { useState, useEffect, useRef } from 'react';
import { formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import {
  MessageSquare, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Send, Paperclip, Phone, Video, Users, Settings,
  Bell, Clock, CheckCircle, AlertCircle, Star, Hash, Lock,
  Smile, Image, File, Calendar, Target, Activity, Archive,
  Pin, Reply, Share, MoreVertical, UserCheck, Building,
  TrendingUp, BarChart3, Zap, Globe
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { Message, Collaboration, CollaborationTask } from '../../types/tiers';

const CollaborationModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedChat, setSelectedChat] = useState<Record<string, unknown> | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live data from Dexie
  const thirdParties = useLiveQuery(() => db.thirdParties.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray()) || [];

  // Build chat data from third parties
  const mockChats = thirdParties.map((tp) => {
    const typeLabel = tp.type === 'customer' ? 'CLIENT' : tp.type === 'supplier' ? 'FOURNISSEUR' : 'CLIENT/FOURNISSEUR';
    return {
      id: tp.id,
      type: 'tiers' as const,
      name: tp.name,
      lastMessage: `Dernier échange avec ${tp.name}`,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isOnline: tp.isActive,
      participants: [
        { id: `contact-${tp.id}`, name: tp.name, role: typeLabel, avatar: tp.name.substring(0, 2).toUpperCase() },
      ],
      tiersInfo: {
        type: typeLabel,
        chiffreAffaires: Math.abs(tp.balance),
        encours: tp.balance > 0 ? tp.balance : 0,
      },
      messages: [] as Array<{
        id: string;
        senderId: string;
        senderName: string;
        content: string;
        timestamp: string;
        type: string;
        isOwn: boolean;
      }>,
    };
  });

  // Build collaborations from third parties with active status
  const mockCollaborations = thirdParties
    .filter(tp => tp.isActive)
    .map((tp) => ({
      id: `collab-${tp.id}`,
      title: `Collaboration avec ${tp.name}`,
      description: `Suivi collaboratif pour ${tp.name} (${tp.code})`,
      status: 'ACTIVE',
      priority: Math.abs(tp.balance) > 500000 ? 'HAUTE' : 'NORMALE',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      participants: [
        { id: `contact-${tp.id}`, name: tp.name, role: tp.type === 'customer' ? 'Client' : 'Fournisseur' },
      ],
      tasks: [] as Array<{ id: string; title: string; status: string; assignee: string }>,
      progress: 0,
      documents: [] as Array<{ id: string; name: string; size: number; uploadedBy: string }>,
    }));

  // Mock Analytics Data
  const analyticsData = {
    statistiques: {
      totalMessages: 1247,
      messagesAujourdhui: 34,
      collaborationsActives: 12,
      tauxReponse: 94.5
    },
    activiteParJour: [
      { jour: 'Lun', messages: 45, collaborations: 3 },
      { jour: 'Mar', messages: 52, collaborations: 4 },
      { jour: 'Mer', messages: 38, collaborations: 2 },
      { jour: 'Jeu', messages: 61, collaborations: 5 },
      { jour: 'Ven', messages: 48, collaborations: 3 },
      { jour: 'Sam', messages: 12, collaborations: 1 },
      { jour: 'Dim', messages: 8, collaborations: 0 }
    ],
    typesCommunication: [
      { type: 'Messages', count: 156, pourcentage: 62 },
      { type: 'Appels', count: 45, pourcentage: 18 },
      { type: 'Visioconférences', count: 28, pourcentage: 11 },
      { type: 'Emails', count: 23, pourcentage: 9 }
    ],
    tempsReponse: [
      { periode: '< 1h', count: 78 },
      { periode: '1-4h', count: 45 },
      { periode: '4-24h', count: 23 },
      { periode: '> 24h', count: 8 }
    ]
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'collaborations', label: 'Collaborations', icon: Users },
    { id: 'visioconference', label: 'Visioconférence', icon: Video },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      const newMessage = {
        id: `m${Date.now()}`,
        senderId: 'current-user',
        senderName: 'Vous',
        content: messageText,
        timestamp: new Date().toISOString(),
        type: 'text',
        isOwn: true
      };

      // Update selected chat messages
      setSelectedChat({
        ...selectedChat,
        messages: [...selectedChat.messages, newMessage]
      });

      setMessageText('');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'SUSPENDUE': 'bg-yellow-100 text-yellow-800',
      'TERMINEE': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'ANNULEE': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'HAUTE': 'bg-red-100 text-red-800',
      'NORMALE': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'BASSE': 'bg-gray-100 text-gray-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTaskStatusColor = (status: string) => {
    const colors = {
      'A_FAIRE': 'bg-gray-100 text-gray-800',
      'EN_COURS': 'bg-yellow-100 text-yellow-800',
      'TERMINE': 'bg-green-100 text-green-800',
      'ANNULE': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const COLORS = ['#7A99AC', '#6A89AC', '#5A79AC', '#4A69AC'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#191919]">Chat & Collaboration</h1>
                <p className="text-sm text-[#666666]">Communication en temps réel et collaboration équipe</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg" aria-label="Paramètres">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#7A99AC] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Chat List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {mockChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedChat?.id === chat.id ? 'bg-[#6A8A82]/5 border-l-4 border-l-[#7A99AC]' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          chat.type === 'tiers' ? 'bg-[#6A8A82]' : 'bg-green-500'
                        }`}>
                          {chat.type === 'tiers' ? (
                            <Building className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        {chat.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{chat.name}</p>
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#7A99AC] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 truncate mt-1">{chat.lastMessage}</p>
                        <p className="text-xs text-gray-700 mt-1">
                          {formatTime(chat.lastMessageTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-3">
            {selectedChat ? (
              <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      selectedChat.type === 'tiers' ? 'bg-[#6A8A82]' : 'bg-green-500'
                    }`}>
                      {selectedChat.type === 'tiers' ? (
                        <Building className="w-5 h-5" />
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-700">
                        {selectedChat.participants.map((participant, index) => (
                          <span key={participant.id}>
                            {participant.name}
                            {index < selectedChat.participants.length - 1 && ', '}
                          </span>
                        ))}
                        {selectedChat.isOnline && (
                          <span className="flex items-center text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            En ligne
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <Video className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tiers Info Bar (pour les chats tiers) */}
                {selectedChat.type === 'tiers' && selectedChat.tiersInfo && (
                  <div className="px-4 py-2 bg-[#6A8A82]/5 border-b border-[#6A8A82]/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6A8A82] font-medium">
                        {selectedChat.tiersInfo.type}
                      </span>
                      <div className="flex items-center space-x-4 text-[#6A8A82]">
                        {selectedChat.tiersInfo.chiffreAffaires && (
                          <span>CA: {selectedChat.tiersInfo.chiffreAffaires.toLocaleString()} FCFA</span>
                        )}
                        {selectedChat.tiersInfo.encours && (
                          <span>Encours: {selectedChat.tiersInfo.encours.toLocaleString()} FCFA</span>
                        )}
                        {selectedChat.tiersInfo.evaluation && (
                          <span>Éval: {selectedChat.tiersInfo.evaluation}/10</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(selectedChat.messages as Array<Record<string, unknown>>).map((message: Record<string, unknown>) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        message.isOwn
                          ? 'bg-[#7A99AC] text-white rounded-l-lg rounded-tr-lg'
                          : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
                      } p-3`}>
                        {!message.isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-75">
                            {message.senderName}
                          </p>
                        )}

                        {message.type === 'text' && (
                          <p className="text-sm">{message.content}</p>
                        )}

                        {message.type === 'file' && (
                          <div className="flex items-center space-x-2">
                            <File className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">{message.fileName}</p>
                              <p className="text-xs opacity-75">{message.fileSize} MB</p>
                            </div>
                          </div>
                        )}

                        <p className={`text-xs mt-1 ${
                          message.isOwn ? 'text-[#6A8A82]/70' : 'text-gray-700'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <Image className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Tapez votre message..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] focus:border-transparent"
                      />
                    </div>
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="p-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Sélectionnez une conversation</h3>
                  <p className="text-gray-700">Choisissez un chat pour commencer à communiquer</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaborations Tab */}
      {activeTab === 'collaborations' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Collaborations Actives</p>
                  <p className="text-lg font-bold text-[#191919]">12</p>
                </div>
                <Users className="w-8 h-8 text-[#6A8A82]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Tâches en Cours</p>
                  <p className="text-lg font-bold text-[#191919]">28</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Échéances Cette Semaine</p>
                  <p className="text-lg font-bold text-[#191919]">5</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Completion</p>
                  <p className="text-lg font-bold text-[#191919]">78%</p>
                </div>
                <Target className="w-8 h-8 text-[#B87333]" />
              </div>
            </div>
          </div>

          {/* Collaborations List */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#191919]">Collaborations en Cours</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Nouvelle Collaboration</span>
                </button>
              </div>

              <div className="space-y-6">
                {mockCollaborations.map((collab) => (
                  <div key={collab.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-[#191919]">{collab.title}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(collab.status)}`}>
                            {collab.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(collab.priority)}`}>
                            {collab.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{collab.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-700">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Échéance: {formatDate(collab.dueDate)}
                          </span>
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {collab.participants.length} participants
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-[#6A8A82] hover:text-[#6A8A82]/80 hover:bg-[#6A8A82]/5 rounded-lg" aria-label="Voir les détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progression</span>
                        <span className="text-sm font-medium text-gray-700">{collab.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#7A99AC] h-2 rounded-full"
                          style={{ width: `${collab.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Participants</p>
                      <div className="flex items-center space-x-2">
                        {collab.participants.map((participant) => (
                          <div key={participant.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                            <div className="w-6 h-6 bg-[#7A99AC] rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                              {participant.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm text-gray-700">{participant.name}</span>
                            <span className="text-xs text-gray-700 ml-1">({participant.role})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tâches</p>
                      <div className="space-y-2">
                        {collab.tasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-3">
                              <CheckCircle className={`w-4 h-4 ${
                                task.status === 'TERMINE' ? 'text-green-500' : 'text-gray-700'
                              }`} />
                              <span className={`text-sm ${
                                task.status === 'TERMINE' ? 'line-through text-gray-700' : 'text-gray-900'
                              }`}>
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTaskStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              <span className="text-xs text-gray-700">{task.assignee}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Documents ({collab.documents.length})</p>
                      <div className="flex items-center space-x-4">
                        {collab.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center bg-[#6A8A82]/5 rounded-lg px-3 py-2">
                            <File className="w-4 h-4 text-[#6A8A82] mr-2" />
                            <div>
                              <p className="text-sm font-medium text-[#6A8A82]">{doc.name}</p>
                              <p className="text-xs text-[#6A8A82]">{doc.size} MB • {doc.uploadedBy}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Messages Total</p>
                  <p className="text-lg font-bold text-[#191919]">{analyticsData.statistiques.totalMessages}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-[#6A8A82]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Messages Aujourd'hui</p>
                  <p className="text-lg font-bold text-[#191919]">{analyticsData.statistiques.messagesAujourdhui}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Collaborations Actives</p>
                  <p className="text-lg font-bold text-[#191919]">{analyticsData.statistiques.collaborationsActives}</p>
                </div>
                <Users className="w-8 h-8 text-[#B87333]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Réponse</p>
                  <p className="text-lg font-bold text-[#191919]">{analyticsData.statistiques.tauxReponse}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activité par jour */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Activité par Jour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.activiteParJour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="jour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="messages" name="Messages" fill="#7A99AC" />
                  <Bar dataKey="collaborations" name="Collaborations" fill="#6A89AC" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Types de communication */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Types de Communication</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="count"
                    data={analyticsData.typesCommunication}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ type, pourcentage }) => `${type} (${pourcentage}%)`}
                  >
                    {analyticsData.typesCommunication.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temps de réponse */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Temps de Réponse</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {analyticsData.tempsReponse.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-[#666666] mb-2">{item.periode}</p>
                  <p className="text-lg font-bold text-[#191919]">{item.count}</p>
                  <p className="text-sm text-[#666666]">messages</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visioconférence Tab */}
      {activeTab === 'visioconference' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Visioconférence</h3>
            <p className="text-[#666666] mb-6">Lancez des appels vidéo avec vos contacts et équipes</p>
            <div className="space-y-4">
              <button className="flex items-center space-x-2 px-6 py-3 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] mx-auto">
                <Video className="w-5 h-5" />
                <span>Démarrer un appel vidéo</span>
              </button>
              <button className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 mx-auto">
                <Calendar className="w-5 h-5" />
                <span>Planifier une réunion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationModule;