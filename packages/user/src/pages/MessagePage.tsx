import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Megaphone
} from 'lucide-react';
import { userService } from '../services/userService';
import { toast } from 'sonner';

const MessagePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'notice' | 'news'>('notice');
  const [notices, setNotices] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [activeTab]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getMessages({ 
        type: activeTab === 'notice' ? 'notice' : 'news',
        pageSize: 50 
      });
      
      if (activeTab === 'notice') {
        setNotices(data.items || []);
      } else {
        setNews(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      
      // Clear existing data on error and show empty state
      if (activeTab === 'notice') {
        setNotices([]);
      } else {
        setNews([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-300"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">Message</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 px-4 pb-2">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('notice')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'notice' 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-gray-400'
            }`}
          >
            Notice
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'news' 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-gray-400'
            }`}
          >
            News
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'notice' && (
          <>
            {isLoading ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-4"></div>
                <p>Loading messages...</p>
              </div>
            ) : notices.length > 0 ? (
              <>
                {notices.map((notice) => (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Megaphone className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">{notice.title}</h3>
                        <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                          {notice.content}
                        </p>
                        <p className="text-xs text-gray-500">{notice.timestamp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div className="text-center text-gray-500 text-sm py-4">
                  No more
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No notices available</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'news' && (
          <div className="text-center text-gray-500 py-8">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p>No news available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagePage;
