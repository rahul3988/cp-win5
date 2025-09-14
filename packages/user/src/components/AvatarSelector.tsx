import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, User } from 'lucide-react';
import { AVATAR_IMAGES, DEFAULT_AVATAR, getAvatarById } from '../assets/avatars';

interface AvatarSelectorProps {
  selectedAvatar?: string;
  onAvatarSelect: (avatarId: string) => void;
  className?: string;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onAvatarSelect,
  className = ''
}) => {
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);

  const currentAvatar = selectedAvatar ? getAvatarById(selectedAvatar) : DEFAULT_AVATAR;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center border-2 border-gold-500/50">
          {currentAvatar ? (
            <img
              src={currentAvatar.path}
              alt={currentAvatar.name}
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Choose Avatar</h3>
          <p className="text-sm text-gray-400">Select your profile picture</p>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {AVATAR_IMAGES.map((avatar) => (
          <motion.button
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar.id)}
            onMouseEnter={() => setHoveredAvatar(avatar.id)}
            onMouseLeave={() => setHoveredAvatar(null)}
            className={`
              relative h-12 w-12 rounded-full border-2 transition-all duration-200
              ${selectedAvatar === avatar.id
                ? 'border-gold-400 ring-2 ring-gold-400/50'
                : 'border-gray-600 hover:border-gold-500/50'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={avatar.path}
              alt={avatar.name}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <User className="h-full w-full text-gray-400 hidden" />
            
            {/* Selection indicator */}
            {selectedAvatar === avatar.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 bg-gold-400 rounded-full flex items-center justify-center"
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}

            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredAvatar === avatar.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
                >
                  {avatar.name}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelector;
