// Import avatar images
import avatar1 from './avatar1.png';
import avatar2 from './avatar2.png';
import avatar3 from './avatar3.png';
import avatar4 from './avatar4.png';
import avatar5 from './avatar5.png';
import avatar6 from './avatar6.png';
import avatar7 from './avatar7.png';
import avatar8 from './avatar8.png';
import avatar9 from './avatar9.png';
import avatar10 from './avatar10.png';
import avatar11 from './avatar11.png';
import avatar12 from './avatar12.png';
import avatar13 from './avatar13.png';
import avatar14 from './avatar14.png';
import avatar15 from './avatar15.png';
import avatar16 from './avatar16.png';
import avatar17 from './avatar17.png';
import avatar18 from './avatar18.png';
import avatar19 from './avatar19.png';

// Avatar images for user profiles
export const AVATAR_IMAGES = [
  { id: 'avatar-1', name: 'Classic Gold', path: avatar1 },
  { id: 'avatar-2', name: 'Royal Blue', path: avatar2 },
  { id: 'avatar-3', name: 'Emerald Green', path: avatar3 },
  { id: 'avatar-4', name: 'Ruby Red', path: avatar4 },
  { id: 'avatar-5', name: 'Purple Crown', path: avatar5 },
  { id: 'avatar-6', name: 'Silver Shield', path: avatar6 },
  { id: 'avatar-7', name: 'Bronze Lion', path: avatar7 },
  { id: 'avatar-8', name: 'Diamond Star', path: avatar8 },
  { id: 'avatar-9', name: 'Crystal Moon', path: avatar9 },
  { id: 'avatar-10', name: 'Golden Eagle', path: avatar10 },
  { id: 'avatar-11', name: 'Platinum Crown', path: avatar11 },
  { id: 'avatar-12', name: 'Sapphire Gem', path: avatar12 },
  { id: 'avatar-13', name: 'Topaz Sun', path: avatar13 },
  { id: 'avatar-14', name: 'Amethyst Rose', path: avatar14 },
  { id: 'avatar-15', name: 'Pearl Shell', path: avatar15 },
  { id: 'avatar-16', name: 'Jade Dragon', path: avatar16 },
  { id: 'avatar-17', name: 'Coral Reef', path: avatar17 },
  { id: 'avatar-18', name: 'Turquoise Wave', path: avatar18 },
  { id: 'avatar-19', name: 'Onyx Knight', path: avatar19 },
];

export const DEFAULT_AVATAR = AVATAR_IMAGES[0]; // Classic Gold as default

// Helper function to get avatar by ID
export const getAvatarById = (id: string) => {
  return AVATAR_IMAGES.find(avatar => avatar.id === id) || DEFAULT_AVATAR;
};

// Helper function to get random avatar
export const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * AVATAR_IMAGES.length);
  return AVATAR_IMAGES[randomIndex];
};
