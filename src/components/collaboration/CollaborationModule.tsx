/**
 * Module de Chat & Collaboration
 * Gestion des communications et du travail collaboratif
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  UserPlus,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Image,
  File,
  Users,
  Hash,
  AtSign,
  Bell,
  Pin,
  Star,
  Archive,
  Settings,
  ChevronDown,
  Circle,
  CheckCircle,
  Clock,
  AlertCircle,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Plus,
  X,
  Edit,
  Trash2,
  Download,
  Share2,
  Calendar,
  MapPin,
  Link2,
  ThumbsUp,
  Heart,
  Laugh,
  Frown
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  edited?: boolean;
  reactions?: Reaction[];
  attachments?: Attachment[];
  replyTo?: string;
  isRead?: boolean;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'direct' | 'group';
  description?: string;
  members: string[];
  lastMessage?: string;
  lastActivity?: Date;
  unreadCount: number;
  isPinned?: boolean;
  avatar?: string;
}

interface User {
  id: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  role?: string;
  department?: string;
}

const CollaborationModule: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Données simulées
  const [channels] = useState<Channel[]>([
    {
      id: 'general',
      name: 'Général',
      type: 'channel',
      description: 'Canal principal de communication',
      members: ['user1', 'user2', 'user3'],
      lastMessage: 'Bienvenue dans le canal général!',
      lastActivity: new Date(),
      unreadCount: 0,
      isPinned: true
    },
    {
      id: 'comptabilite',
      name: 'Comptabilité',
      type: 'channel',
      description: 'Discussions sur la comptabilité',
      members: ['user1', 'user2'],
      lastMessage: 'La clôture mensuelle est presque terminée',
      lastActivity: new Date(Date.now() - 3600000),
      unreadCount: 3
    },
    {
      id: 'projets',
      name: 'Projets',
      type: 'channel',
      members: ['user1', 'user2', 'user3', 'user4'],
      lastMessage: 'Le nouveau module CRM est en cours',
      lastActivity: new Date(Date.now() - 7200000),
      unreadCount: 0
    },
    {
      id: 'dm-marie',
      name: 'Marie Dupont',
      type: 'direct',
      members: ['user1', 'user2'],
      lastMessage: 'Peux-tu vérifier les factures?',
      lastActivity: new Date(Date.now() - 1800000),
      unreadCount: 1,
      avatar: 'MD'
    }
  ]);

  const [messages] = useState<Message[]>([
    {
      id: '1',
      text: 'Bonjour tout le monde! 👋',
      sender: 'Jean Dupont',
      senderId: 'user1',
      timestamp: new Date(Date.now() - 7200000),
      reactions: [
        { emoji: '👍', users: ['Marie', 'Pierre'] },
        { emoji: '❤️', users: ['Sophie'] }
      ],
      isRead: true
    },
    {
      id: '2',
      text: 'La réunion de ce matin était très productive. Voici le compte-rendu en pièce jointe.',
      sender: 'Marie Martin',
      senderId: 'user2',
      timestamp: new Date(Date.now() - 3600000),
      attachments: [
        {
          id: 'a1',
          name: 'CR_Reunion_2024-03-15.pdf',
          size: 245678,
          type: 'application/pdf',
          url: '/files/cr.pdf'
        }
      ],
      isRead: true
    },
    {
      id: '3',
      text: 'Excellent travail sur le rapport financier! Les graphiques sont très clairs.',
      sender: 'Pierre Durand',
      senderId: 'user3',
      timestamp: new Date(Date.now() - 1800000),
      replyTo: '2',
      isRead: true
    },
    {
      id: '4',
      text: 'N\'oubliez pas la deadline pour la clôture mensuelle: vendredi 17h!',
      sender: 'Sophie Leblanc',
      senderId: 'user4',
      timestamp: new Date(Date.now() - 900000),
      isRead: false
    }
  ]);

  const [users] = useState<User[]>([
    {
      id: 'user1',
      name: 'Jean Dupont',
      status: 'online',
      role: 'Directeur Financier',
      department: 'Finance'
    },
    {
      id: 'user2',
      name: 'Marie Martin',
      status: 'online',
      role: 'Comptable Senior',
      department: 'Comptabilité'
    },
    {
      id: 'user3',
      name: 'Pierre Durand',
      status: 'busy',
      role: 'Contrôleur de Gestion',
      department: 'Finance'
    },
    {
      id: 'user4',
      name: 'Sophie Leblanc',
      status: 'away',
      role: 'Assistante Comptable',
      department: 'Comptabilité'
    },
    {
      id: 'user5',
      name: 'Alex Chen',
      status: 'offline',
      role: 'Développeur',
      department: 'IT'
    }
  ]);

  const currentChannel = channels.find(c => c.id === activeChannel);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    // Logique d'envoi du message
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full bg-gray-50 flex">
      {/* Sidebar gauche - Liste des canaux */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Chat & Collaboration</h2>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]/50 text-sm"
            />
          </div>
        </div>

        {/* Canaux */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-gray-700 uppercase">Canaux</span>
              <button className="p-1 hover:bg-gray-100 rounded" aria-label="Ajouter">
                <Plus className="w-3 h-3 text-gray-700" />
              </button>
            </div>

            {channels.filter(c => c.type === 'channel').map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeChannel === channel.id
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Hash className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{channel.name}</span>
                    {channel.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#B87333] text-white text-xs rounded-full">
                        {channel.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                {channel.isPinned && <Pin className="w-3 h-3 text-gray-700" />}
              </button>
            ))}
          </div>

          {/* Messages directs */}
          <div className="p-2 border-t">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-gray-700 uppercase">Messages directs</span>
              <button className="p-1 hover:bg-gray-100 rounded" aria-label="Ajouter">
                <UserPlus className="w-3 h-3 text-gray-700" />
              </button>
            </div>

            {channels.filter(c => c.type === 'direct').map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeChannel === channel.id
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                    {channel.avatar}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    users.find(u => u.name === channel.name)?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{channel.name}</span>
                    {channel.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#B87333] text-white text-xs rounded-full">
                        {channel.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 truncate">{channel.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pied de page avec statut utilisateur */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#6A8A82] flex items-center justify-center text-white text-xs font-medium">
                MD
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-50" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Marie Dupont</p>
              <p className="text-xs text-gray-700">En ligne</p>
            </div>
            <button className="p-1 hover:bg-gray-200 rounded" aria-label="Paramètres">
              <Settings className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col">
        {/* En-tête du canal */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentChannel?.type === 'channel' ? (
              <Hash className="w-5 h-5 text-gray-700" />
            ) : (
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {currentChannel?.avatar}
                </div>
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  users.find(u => u.name === currentChannel?.name)?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{currentChannel?.name}</h3>
              {currentChannel?.description && (
                <p className="text-xs text-gray-700">{currentChannel.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Pin className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className={`p-2 rounded-lg transition-colors ${
                showUserList ? 'bg-gray-100' : 'hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Zone des messages */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div key={msg.id} className={`flex ${msg.senderId === 'user2' ? 'justify-end' : ''}`}>
                  <div className={`flex space-x-3 max-w-2xl ${msg.senderId === 'user2' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {msg.sender.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="flex-1">
                      <div className={`flex items-baseline space-x-2 mb-1 ${msg.senderId === 'user2' ? 'justify-end' : ''}`}>
                        <span className="text-sm font-medium text-gray-900">{msg.sender}</span>
                        <span className="text-xs text-gray-700">{formatTime(msg.timestamp)}</span>
                        {msg.edited && <span className="text-xs text-gray-700">(modifié)</span>}
                      </div>

                      {/* Reply to */}
                      {msg.replyTo && (
                        <div className="border-l-2 border-gray-300 pl-3 mb-2 text-sm text-gray-600">
                          En réponse à un message...
                        </div>
                      )}

                      <div className={`rounded-lg px-4 py-2 ${
                        msg.senderId === 'user2'
                          ? 'bg-[#6A8A82] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                              <File className="w-4 h-4 text-gray-700" />
                              <span className="text-sm text-gray-700 flex-1">{att.name}</span>
                              <span className="text-xs text-gray-700">{formatFileSize(att.size)}</span>
                              <button className="p-1 hover:bg-gray-200 rounded" aria-label="Télécharger">
                                <Download className="w-3 h-3 text-gray-700" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.reactions.map((reaction, idx) => (
                            <button
                              key={idx}
                              className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors"
                            >
                              <span>{reaction.emoji}</span>
                              <span className="text-gray-600">{reaction.users.length}</span>
                            </button>
                          ))}
                          <button className="p-1 hover:bg-gray-100 rounded-full" aria-label="Ajouter">
                            <Plus className="w-3 h-3 text-gray-700" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Indicateur de frappe */}
              {isTyping && (
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Quelqu'un est en train d'écrire...</span>
                </div>
              )}
            </div>

            {/* Zone de saisie */}
            <div className="bg-white border-t p-4">
              <div className="flex items-end space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-700" />
                </button>

                <div className="flex-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tapez votre message..."
                    className="w-full px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6A8A82]/50"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Smile className="w-5 h-5 text-gray-700" />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    message.trim()
                      ? 'bg-[#6A8A82] hover:bg-[#5A7A72] text-white'
                      : 'bg-gray-100 text-gray-700 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar droite - Liste des utilisateurs */}
          {showUserList && (
            <div className="w-64 bg-white border-l border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-4">
                Membres ({users.length})
              </h4>

              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-700">{user.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationModule;