import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { 
  Send, 
  Users, 
  User, 
  Search, 
  MessageCircle, 
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Hash,
  ShieldAlert
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatMessage, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ChatModule: React.FC = () => {
  const { profile } = useAuth();
  const [activeRoom, setActiveRoom] = useState<string>('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch System Users
  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      
      // Filter users to only include specific roles/permissions
      const chatAllowedUsers = usersData.filter(u => 
        u.isAdmin || // Admin / Owner
        u.permissions?.finance || // Accounting Manager
        u.permissions?.production || // Operations Manager
        u.permissions?.dashboard // Operations/General Manager
      );
      
      setSystemUsers(chatAllowedUsers);
    });
    return () => unsubscribe();
  }, [profile]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages for the active room
  useEffect(() => {
    if (!activeRoom) return;

    const q = query(
      collection(db, 'chatMessages'),
      where('roomId', '==', activeRoom),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    try {
      await addDoc(collection(db, 'chatMessages'), {
        roomId: activeRoom,
        senderId: profile.uid,
        senderName: profile.name,
        text: newMessage,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp() // For backup ordering
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredUsers = systemUsers.filter(user => 
    user.uid !== profile?.uid && 
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDirectRoomId = (userId: string) => {
    if (!profile) return 'global';
    const ids = [profile.uid, userId].sort();
    return `direct_${ids[0]}_${ids[1]}`;
  };

  const activeContact = activeRoom.startsWith('direct_') 
    ? systemUsers.find(u => getDirectRoomId(u.uid) === activeRoom)
    : null;

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
      {/* Sidebar */}
      <div className="w-80 border-l border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <MessageCircle className="text-blue-600" />
            المحادثات
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="بحث عن مدير..." 
              className="pr-10 bg-slate-50 border-slate-100 rounded-xl h-10 text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Global Room */}
          <button
            onClick={() => setActiveRoom('global')}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200",
              activeRoom === 'global' 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                : "hover:bg-white text-slate-600 hover:shadow-sm"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              activeRoom === 'global' ? "bg-slate-800" : "bg-blue-50 text-blue-600"
            )}>
              <ShieldAlert size={20} />
            </div>
            <div className="flex-1 text-right">
              <div className="font-black text-sm">غرفة الإدارة</div>
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                activeRoom === 'global' ? "text-slate-400" : "text-slate-400"
              )}>لجميع المديرين والمالك</div>
            </div>
          </button>

          <div className="px-4 pt-4 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">المديرين</span>
          </div>

          {filteredUsers.map(user => {
            const roomId = getDirectRoomId(user.uid);
            const isActive = activeRoom === roomId;

            return (
              <button
                key={user.uid}
                onClick={() => setActiveRoom(roomId)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-white border border-slate-100 shadow-md ring-2 ring-blue-500/10" 
                    : "hover:bg-white text-slate-600 border border-transparent hover:border-slate-100 hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-sm uppercase transition-colors",
                  isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-400"
                )}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className={cn(
                    "font-black text-sm truncate",
                    isActive ? "text-slate-900" : "text-slate-700"
                  )}>{user.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 truncate">
                    {user.isAdmin ? 'مدير نظام / مالك' : 'مدير إدارة'}
                  </div>
                </div>
                {/* Online status indicator placeholder */}
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="h-20 px-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            {activeContact ? (
              <>
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                  {activeContact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="text-right">
                  <h3 className="font-black text-slate-800 leading-tight">{activeContact.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">متصل الآن</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div className="text-right">
                  <h3 className="font-black text-slate-800 leading-tight">غرفة الإدارة</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تواصل مع المديرين والمالك</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50">
              <Search size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50">
              <MoreVertical size={20} />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.senderId === profile?.uid;
              const prevMsg = messages[index - 1];
              const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    isMe ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className="w-8 shrink-0">
                    {!isMe && showAvatar && (
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-[10px] uppercase">
                        {msg.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[70%] space-y-1",
                    isMe ? "items-end text-left" : "items-start text-right"
                  )}>
                    {!isMe && showAvatar && (
                      <span className="text-[10px] font-black text-slate-400 mr-1">{msg.senderName}</span>
                    )}
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                      isMe 
                        ? "bg-slate-900 text-white rounded-tl-none" 
                        : "bg-white text-slate-700 border border-slate-100 rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 px-1">
                      {msg.timestamp ? format(new Date(msg.timestamp), 'hh:mm a', { locale: ar }) : ''}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Smile size={20} />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <ImageIcon size={20} />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Paperclip size={20} />
              </Button>
            </div>
            <Input 
              placeholder="اكتب رسالتك هنا..." 
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-sm font-medium text-slate-700 h-10"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-12 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            >
              <Send size={18} className="rotate-180" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
