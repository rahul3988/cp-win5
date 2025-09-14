import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// import sharp from 'sharp'; // Not currently used - removed from dependencies
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { createSuccessResponse, createErrorResponse } from '@win5x/common';
import { logger } from '../utils/logger';

const router: Router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Image compression and resizing utility (simplified version)
async function processAvatarImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    // For now, just copy the file without processing
    // TODO: Add sharp processing later
    fs.copyFileSync(inputPath, outputPath);
  } catch (error) {
    logger.error('Error processing avatar image:', error);
    throw new Error('Failed to process image');
  }
}

// Upload avatar endpoint
router.post('/avatar', authenticateToken, upload.single('avatar'), asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('No file uploaded'));
    }

    const originalPath = req.file.path;
    const processedPath = originalPath.replace(path.extname(originalPath), '_processed.jpg');
    
    // Process the image (resize and compress)
    await processAvatarImage(originalPath, processedPath);
    
    // Delete the original file
    fs.unlinkSync(originalPath);
    
    // Generate the public URL
    const fileName = path.basename(processedPath);
    const avatarUrl = `/uploads/avatars/${fileName}`;
    
    logger.info(`Avatar uploaded successfully: ${avatarUrl}`);
    
    res.json(createSuccessResponse({
      avatarUrl,
      fileName,
      size: req.file.size,
      originalName: req.file.originalname
    }, 'Avatar uploaded successfully'));
    
  } catch (error) {
    logger.error('Avatar upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json(createErrorResponse('Failed to upload avatar'));
  }
}));

// Get avatar endpoint (for serving uploaded avatars)
router.get('/avatars/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json(createErrorResponse('Avatar not found'));
  }
  
  res.sendFile(filePath);
});

export { router as uploadRoutes };
