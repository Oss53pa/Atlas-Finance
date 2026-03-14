/**
 * ContextualComments - Système de commentaires contextuels
 * Permet d'annoter directement sur les sections, graphiques et texte
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  MessageSquare,
  Reply,
  MoreHorizontal,
  Check,
  X,
  Send,
  AtSign,
  Paperclip,
  Smile,
  Pin,
  Flag,
  Trash2,
  Edit3,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  content: string;
  timestamp: string;
  targetType: 'section' | 'block' | 'chart' | 'text' | 'cell';
  targetId: string;
  targetLabel?: string;
  position?: { x: number; y: number };
  status: 'open' | 'resolved' | 'pending';
  priority: 'normal' | 'high' | 'urgent';
  mentions: string[];
  replies: CommentReply[];
  isPinned?: boolean;
  attachments?: { name: string; url: string }[];
}

export interface CommentReply {
  id: string;
  author: {
    id: string;
    name: string;
    initials: string;
  };
  content: string;
  timestamp: string;
}

interface ContextualCommentsProps {
  comments: Comment[];
  currentUserId: string;
  users: { id: string; name: string; initials: string }[];
  onAddComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  onReply: (commentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onPin: (commentId: string) => void;
  selectedTargetId?: string;
  className?: string;
}

export const ContextualComments: React.FC<ContextualCommentsProps> = ({
  comments,
  currentUserId,
  users,
  onAddComment,
  onReply,
  onResolve,
  onDelete,
  onPin,
  selectedTargetId,
  className,
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'mine'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const filteredComments = comments.filter(c => {
    if (selectedTargetId && c.targetId !== selectedTargetId) return false;
    if (filter === 'open') return c.status === 'open';
    if (filter === 'resolved') return c.status === 'resolved';
    if (filter === 'mine') return c.author.id === currentUserId || c.mentions.includes(currentUserId);
    return true;
  });

  const pinnedComments = filteredComments.filter(c => c.isPinned);
  const regularComments = filteredComments.filter(c => !c.isPinned);

  const handleSubmitComment = useCallback(() => {
    if (!newComment.trim()) return;

    const mentions = newComment.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];

    onAddComment({
      author: {
        id: currentUserId,
        name: 'Utilisateur actuel',
        initials: 'UA',
      },
      content: newComment,
      targetType: 'section',
      targetId: selectedTargetId || 'general',
      status: 'open',
      priority: 'normal',
      mentions,
    });

    setNewComment('');
  }, [newComment, currentUserId, selectedTargetId, onAddComment]);

  const handleSubmitReply = useCallback((commentId: string) => {
    if (!replyContent.trim()) return;
    onReply(commentId, replyContent);
    setReplyContent('');
    setReplyingTo(null);
  }, [replyContent, onReply]);

  const toggleExpanded = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const renderComment = (comment: Comment) => {
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div
        key={comment.id}
        className={cn(
          'border rounded-lg transition-all',
          comment.isPinned && 'border-amber-300 bg-amber-50/50',
          comment.status === 'resolved' && 'opacity-60',
          comment.priority === 'urgent' && 'border-red-300 bg-red-50/30',
          comment.priority === 'high' && 'border-orange-300 bg-orange-50/30',
          !comment.isPinned && comment.status !== 'resolved' && comment.priority === 'normal' && 'border-gray-200 bg-white'
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                {comment.author.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{comment.author.name}</p>
                <p className="text-xs text-gray-500">{comment.timestamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {comment.isPinned && (
                <Pin className="w-4 h-4 text-amber-500" />
              )}
              {comment.priority === 'urgent' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {comment.status === 'resolved' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Target badge */}
          {comment.targetLabel && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                <MessageSquare className="w-3 h-3" />
                {comment.targetLabel}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.content.split(/(@\w+)/g).map((part, i) =>
              part.startsWith('@') ? (
                <span key={i} className="text-primary font-medium">{part}</span>
              ) : part
            )}
          </p>

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                >
                  <Paperclip className="w-3 h-3" />
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              Répondre
            </button>
            {comment.replies.length > 0 && (
              <button
                onClick={() => toggleExpanded(comment.id)}
                className="text-xs text-gray-500 hover:text-primary"
              >
                {isExpanded ? 'Masquer' : `${comment.replies.length} réponse(s)`}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPin(comment.id)}
              className={cn(
                'p-1 rounded hover:bg-gray-100',
                comment.isPinned ? 'text-amber-500' : 'text-gray-400'
              )}
              title="Épingler"
            >
              <Pin className="w-4 h-4" />
            </button>
            {comment.status === 'open' && (
              <button
                onClick={() => onResolve(comment.id)}
                className="p-1 rounded hover:bg-green-100 text-gray-400 hover:text-green-600"
                title="Marquer comme résolu"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Replies */}
        {isExpanded && comment.replies.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs">
                  {reply.author.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{reply.author.name}</span>
                    <span className="text-xs text-gray-400">{reply.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Écrire une réponse..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitReply(comment.id)}
              />
              <button
                onClick={() => handleSubmitReply(comment.id)}
                className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => setReplyingTo(null)}
                className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Commentaires
          <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
            {filteredComments.length}
          </span>
        </h3>

        {/* Filters */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'open', label: 'Ouverts' },
            { id: 'resolved', label: 'Résolus' },
            { id: 'mine', label: 'Mes mentions' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={cn(
                'px-3 py-1 text-xs rounded-full transition-colors',
                filter === f.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Pinned comments */}
        {pinnedComments.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Pin className="w-3 h-3" />
              Épinglés
            </p>
            {pinnedComments.map(renderComment)}
          </div>
        )}

        {/* Regular comments */}
        {regularComments.length > 0 ? (
          regularComments.map(renderComment)
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun commentaire</p>
            <p className="text-xs">Sélectionnez un élément et ajoutez un commentaire</p>
          </div>
        )}
      </div>

      {/* New comment input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              if (e.target.value.endsWith('@')) {
                setShowMentions(true);
              } else {
                setShowMentions(false);
              }
            }}
            placeholder="Ajouter un commentaire... (utilisez @ pour mentionner)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={3}
          />

          {/* Mentions dropdown */}
          {showMentions && (
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setNewComment(prev => prev + user.name + ' ');
                    setShowMentions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                    {user.initials}
                  </span>
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <AtSign className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Smile className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextualComments;
