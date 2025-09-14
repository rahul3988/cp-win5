import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { userService } from '../services/userService';
import { toast } from 'sonner';

const NotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: false,
    gameUpdates: true,
    promotions: true,
    securityAlerts: true,
    depositWithdraw: true,
    vipUpdates: false
  });

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const settings = await userService.getSettings();
      if (settings.notifications) {
        setNotifications(settings.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    }
  };

  const toggleNotification = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    const updatedNotifications = {
      ...notifications,
      [key]: newValue
    };
    
    setNotifications(updatedNotifications);

    try {
      // Update the notification setting using the specific notification settings endpoint
      await userService.updateNotificationSettings(updatedNotifications);
      toast.success('Notification setting updated');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast.error('Failed to update notification settings');
      // Revert the change
      setNotifications(prev => ({
        ...prev,
        [key]: !newValue
      }));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await userService.updateSettings({ notifications });
      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">Notification Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Notification Types */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold text-white">Notification Types</h2>
          </div>
          
          <div className="divide-y divide-gray-700">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gold-400" />
                <div>
                  <div className="font-medium text-white">Push Notifications</div>
                  <div className="text-sm text-gray-300">Receive notifications on your device</div>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('pushNotifications')}
                className="text-gold-400"
              >
                {notifications.pushNotifications ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">Email Notifications</div>
                  <div className="text-sm text-gray-300">Receive notifications via email</div>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('emailNotifications')}
                className="text-gray-400"
              >
                {notifications.emailNotifications ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="font-medium text-white">SMS Notifications</div>
                  <div className="text-sm text-gray-300">Receive notifications via SMS</div>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('smsNotifications')}
                className="text-gray-400"
              >
                {notifications.smsNotifications ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Categories */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold text-white">Content Categories</h2>
          </div>
          
          <div className="divide-y divide-gray-700">
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Game Updates</div>
                <div className="text-sm text-gray-300">New games, features, and updates</div>
              </div>
              <button
                onClick={() => toggleNotification('gameUpdates')}
                className="text-gold-400"
              >
                {notifications.gameUpdates ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Promotions & Bonuses</div>
                <div className="text-sm text-gray-300">Special offers and bonus announcements</div>
              </div>
              <button
                onClick={() => toggleNotification('promotions')}
                className="text-gold-400"
              >
                {notifications.promotions ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Security Alerts</div>
                <div className="text-sm text-gray-300">Important security notifications</div>
              </div>
              <button
                onClick={() => toggleNotification('securityAlerts')}
                className="text-gold-400"
              >
                {notifications.securityAlerts ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Deposit & Withdrawal</div>
                <div className="text-sm text-gray-300">Transaction notifications</div>
              </div>
              <button
                onClick={() => toggleNotification('depositWithdraw')}
                className="text-gold-400"
              >
                {notifications.depositWithdraw ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">VIP Updates</div>
                <div className="text-sm text-gray-300">VIP status and benefits updates</div>
              </div>
              <button
                onClick={() => toggleNotification('vipUpdates')}
                className="text-gray-400"
              >
                {notifications.vipUpdates ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notification Frequency */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold text-white">Notification Frequency</h2>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="radio" name="frequency" value="instant" defaultChecked className="text-gold-500" />
                <span className="text-white">Instant</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="frequency" value="hourly" className="text-gold-500" />
                <span className="text-white">Hourly Digest</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="frequency" value="daily" className="text-gold-500" />
                <span className="text-white">Daily Digest</span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSaveSettings}
          className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg font-semibold hover:from-gold-700 hover:to-gold-800"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default NotificationPage;
