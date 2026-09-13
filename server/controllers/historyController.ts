import { Request, Response, NextFunction } from 'express';
import { historyStore, SpeechHistoryRecord } from '../db/historyStore';
import { audioStorageService } from '../services/supabase/storageService';
import { usageStore } from '../db/usageStore';

/**
 * Helper to enrich history records with fresh short-lived signed URLs for storage paths.
 */
async function signAudioUrlsForRecords(
  records: SpeechHistoryRecord[],
  token?: string
): Promise<SpeechHistoryRecord[]> {
  return Promise.all(
    records.map(async (record) => {
      if (record.audioStoragePath) {
        try {
          const signedUrl = await audioStorageService.createSignedUrl(
            record.audioStoragePath,
            3600,
            token
          );
          if (signedUrl) {
            return {
              ...record,
              audioUrl: signedUrl,
            };
          }
        } catch (err) {
          console.warn(`[History Controller] Could not create signed URL for ${record.id}:`, err);
        }
      }
      return record;
    })
  );
}

/**
 * GET /api/history
 * Returns paginated speech history for the authenticated user with active signed URLs.
 */
export async function getHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const search = (req.query.search as string) || '';

    const result = await historyStore.getHistoryByUserId(
      req.user.id,
      {
        page,
        limit,
        search,
      },
      req.token
    );

    const enrichedHistory = await signAudioUrlsForRecords(result.history, req.token);

    res.status(200).json({
      success: true,
      history: enrichedHistory,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/history/:id
 * Returns single speech history item belonging to authenticated user with active signed URL.
 */
export async function getHistoryItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const item = await historyStore.getHistoryItemById(id, req.user.id, req.token);

    if (!item) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    let finalItem = item;
    if (item.audioStoragePath) {
      const signedUrl = await audioStorageService.createSignedUrl(item.audioStoragePath, 3600, req.token);
      if (signedUrl) {
        finalItem = { ...item, audioUrl: signedUrl };
      }
    }

    res.status(200).json({
      success: true,
      historyItem: finalItem,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/history/:id/audio
 * Generates and returns a fresh short-lived signed URL for the audio object.
 */
export async function getHistoryAudioSignedUrlHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const item = await historyStore.getHistoryItemById(id, req.user.id, req.token);

    if (!item) {
      res.status(404).json({
        success: false,
        code: 'AUDIO_STORAGE_NOT_FOUND',
        message: 'History item not found.',
      });
      return;
    }

    // If item has audio_storage_path, generate signed URL from private bucket
    if (item.audioStoragePath) {
      const signedUrl = await audioStorageService.createSignedUrl(item.audioStoragePath, 3600, req.token);
      if (signedUrl) {
        res.status(200).json({
          success: true,
          audioUrl: signedUrl,
          audioStoragePath: item.audioStoragePath,
          expiresIn: 3600,
        });
        return;
      }
    }

    // Fallback to existing audioUrl if available
    if (item.audioUrl) {
      res.status(200).json({
        success: true,
        audioUrl: item.audioUrl,
        audioStoragePath: item.audioStoragePath || null,
        expiresIn: 3600,
      });
      return;
    }

    res.status(404).json({
      success: false,
      code: 'AUDIO_FILE_NOT_FOUND',
      message: 'Audio file for this record is not available.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/history/:id/download
 * Downloads or streams the audio file for an authenticated user with verified ownership.
 */
export async function downloadHistoryAudioHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const item = await historyStore.getHistoryItemById(id, req.user.id, req.token);

    if (!item) {
      res.status(404).json({
        success: false,
        code: 'AUDIO_STORAGE_NOT_FOUND',
        message: 'History item not found.',
      });
      return;
    }

    const extension = item.audioStoragePath?.endsWith('.mp3')
      ? 'mp3'
      : item.audioStoragePath?.endsWith('.ogg')
      ? 'ogg'
      : 'wav';
    const filename = `textflow-${(item.language || 'audio').toLowerCase()}-${item.id}.${extension}`;

    // Stream from private Supabase Storage if storage path exists
    if (item.audioStoragePath) {
      const downloaded = await audioStorageService.downloadAudioBuffer(item.audioStoragePath, req.token);
      if (downloaded) {
        res.setHeader('Content-Type', downloaded.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', downloaded.buffer.length);
        res.status(200).send(downloaded.buffer);
        return;
      }
    }

    // Fallback: if data URL is stored
    if (item.audioUrl && item.audioUrl.startsWith('data:')) {
      const parts = item.audioUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/wav';
      const buffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
      return;
    }

    // If external URL, redirect
    if (item.audioUrl) {
      res.redirect(item.audioUrl);
      return;
    }

    res.status(404).json({
      success: false,
      code: 'AUDIO_FILE_NOT_FOUND',
      message: 'Audio file is not available for download.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/history/:id
 * Deletes a single speech history item and its Supabase Storage object.
 */
export async function deleteHistoryItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    // 1. Fetch item to retrieve storage path
    const item = await historyStore.getHistoryItemById(id, req.user.id, req.token);
    if (!item) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    // 2. Delete storage object if present
    if (item.audioStoragePath) {
      await audioStorageService.deleteAudioObject(item.audioStoragePath, req.token).catch((err) => {
        console.warn(`[History Controller] Storage cleanup warning for ${item.audioStoragePath}:`, err);
      });
    }

    // 3. Delete database record
    const success = await historyStore.deleteHistoryItem(id, req.user.id, req.token);

    if (!success) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'History item and audio deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/history/:id/favorite
 * Toggles or sets favorite status for a speech history item.
 */
export async function toggleFavoriteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { isFavorite } = req.body;

    // Strict boolean type validation
    if (typeof isFavorite !== 'boolean') {
      res.status(400).json({ success: false, message: 'isFavorite must be a boolean.' });
      return;
    }

    const updated = await historyStore.toggleFavorite(id, req.user.id, isFavorite, req.token);

    if (!updated) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    let finalItem = updated;
    if (updated.audioStoragePath) {
      const signedUrl = await audioStorageService.createSignedUrl(updated.audioStoragePath, 3600, req.token);
      if (signedUrl) {
        finalItem = { ...updated, audioUrl: signedUrl };
      }
    }

    res.status(200).json({
      success: true,
      message: 'Favorite updated successfully.',
      isFavorite: updated.isFavorite,
      historyItem: finalItem,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/favorites
 * Returns paginated list of favorited speech items for the authenticated user with active signed URLs.
 */
export async function getFavoritesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const language = (req.query.language as string) || '';
    const voice = (req.query.voice as string) || '';

    const result = await historyStore.getFavoritesByUserId(
      req.user.id,
      {
        page,
        limit,
        language,
        voice,
      },
      req.token
    );

    const enrichedFavorites = await signAudioUrlsForRecords(result.favorites, req.token);

    res.status(200).json({
      success: true,
      favorites: enrichedFavorites,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/history
 * Clears all speech history and audio storage objects belonging to authenticated user.
 */
export async function clearAllHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // 1. Delete all audio objects in user's audio directory in Supabase Storage
    await audioStorageService.deleteUserAudioFolder(req.user.id, req.token).catch((err) => {
      console.warn(`[History Controller] Bulk audio storage cleanup error for user ${req.user!.id}:`, err);
    });

    // 2. Clear all database history records
    const deletedCount = await historyStore.clearHistoryByUserId(req.user.id, req.token);

    res.status(200).json({
      success: true,
      message: 'Speech history and stored audio files cleared successfully.',
      count: deletedCount,
    });
  } catch (error) {
    next(error);
  }
}
