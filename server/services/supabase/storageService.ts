import { getServerSupabaseClient, getUserSupabaseClient } from './client';

export const AUDIO_BUCKET_NAME = 'textflow-audio';
export const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface AudioUploadResult {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AudioMimeInfo {
  mimeType: string;
  extension: string;
}

/**
 * Detects MIME type and file extension based on data URL prefix, buffer headers, or format hint.
 */
export function detectAudioMimeAndExt(
  dataUrlOrFormat?: string,
  buffer?: Buffer
): AudioMimeInfo {
  const str = (dataUrlOrFormat || '').toLowerCase().trim();

  if (str.startsWith('data:audio/wav') || str.startsWith('data:audio/x-wav') || str === 'wav') {
    return { mimeType: 'audio/wav', extension: 'wav' };
  }
  if (str.startsWith('data:audio/ogg') || str === 'ogg') {
    return { mimeType: 'audio/ogg', extension: 'ogg' };
  }
  if (str.startsWith('data:audio/mp3') || str.startsWith('data:audio/mpeg') || str === 'mp3') {
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  }

  // Buffer signature inspection if available
  if (buffer && buffer.length >= 12) {
    // RIFF....WAVE header for WAV
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return { mimeType: 'audio/wav', extension: 'wav' };
    }

    // OggS header for OGG
    if (
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return { mimeType: 'audio/ogg', extension: 'ogg' };
    }

    // ID3 or sync word 0xFF 0xFB/0xF3 for MP3
    if (
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return { mimeType: 'audio/mpeg', extension: 'mp3' };
    }
  }

  // Default to WAV (standard for Gemini PCM conversion)
  return { mimeType: 'audio/wav', extension: 'wav' };
}

/**
 * Service to manage Supabase Audio Storage operations for private bucket 'textflow-audio'.
 */
export const audioStorageService = {
  /**
   * Ensures the private 'textflow-audio' bucket exists in Supabase Storage.
   * Safe to call multiple times on server boot or before upload.
   */
  async ensureBucket(): Promise<boolean> {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return false;
    }

    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.warn('[Supabase Storage] listBuckets error:', listError.message);
        return false;
      }

      const existing = buckets?.find((b) => b.id === AUDIO_BUCKET_NAME || b.name === AUDIO_BUCKET_NAME);

      if (!existing) {
        const { error: createError } = await supabase.storage.createBucket(AUDIO_BUCKET_NAME, {
          public: false, // STRICTLY PRIVATE
          fileSizeLimit: MAX_AUDIO_FILE_SIZE_BYTES,
          allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'],
        });

        if (createError) {
          console.warn('[Supabase Storage] Failed to create bucket:', createError.message);
          return false;
        }
        console.log(`[Supabase Storage] Private bucket '${AUDIO_BUCKET_NAME}' created successfully.`);
      } else if (existing.public) {
        // Enforce private access if bucket was previously created public
        await supabase.storage.updateBucket(AUDIO_BUCKET_NAME, {
          public: false,
          fileSizeLimit: MAX_AUDIO_FILE_SIZE_BYTES,
          allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'],
        });
        console.log(`[Supabase Storage] Bucket '${AUDIO_BUCKET_NAME}' updated to private.`);
      }

      return true;
    } catch (err: any) {
      console.warn('[Supabase Storage] Error during ensureBucket:', err?.message || err);
      return false;
    }
  },

  /**
   * Uploads audio binary to the private 'textflow-audio' bucket.
   * Path: audio/{userId}/{historyId}.{extension}
   */
  async uploadAudio(options: {
    userId: string;
    historyId: string;
    audioBuffer: Buffer;
    mimeType: string;
    extension: string;
    token?: string;
  }): Promise<AudioUploadResult> {
    const { userId, historyId, audioBuffer, mimeType, extension, token } = options;

    if (!userId || !historyId) {
      const err: any = new Error('Invalid user ID or history ID for storage path.');
      err.code = 'AUDIO_STORAGE_INVALID_PATH';
      err.statusCode = 400;
      throw err;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      const err: any = new Error('Audio payload is empty.');
      err.code = 'AUDIO_STORAGE_UPLOAD_FAILED';
      err.statusCode = 400;
      throw err;
    }

    if (audioBuffer.length > MAX_AUDIO_FILE_SIZE_BYTES) {
      const err: any = new Error('Generated audio file exceeds the 25 MB storage size limit.');
      err.code = 'AUDIO_FILE_TOO_LARGE';
      err.statusCode = 400;
      throw err;
    }

    // Path structure: audio/{userId}/{historyId}/generated-audio.{extension} (compatible with Supabase RLS policy auth.uid()::text = (storage.foldername(name))[2])
    const storagePath = `audio/${userId}/${historyId}/generated-audio.${extension}`;

    const diagnostics = {
      operation: 'upload',
      bucketName: AUDIO_BUCKET_NAME,
      storagePath,
      mimeType,
      byteSize: audioBuffer.length,
      authenticatedUserExists: !!userId,
      hasValidToken: !!token,
      clientType: token ? 'user-scoped' : 'server',
    };

    // Prioritize server client (service role) for robust backend storage operations, fall back to user-scoped client
    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (!supabase) {
      console.error('[Supabase Storage Error]', { ...diagnostics, error: 'Supabase storage client unavailable' });
      const err: any = new Error("Speech was generated, but audio storage is temporarily unavailable.");
      err.code = 'AUDIO_STORAGE_UNAVAILABLE';
      err.statusCode = 503;
      throw err;
    }

    let uploadAttempt = await supabase.storage
      .from(AUDIO_BUCKET_NAME)
      .upload(storagePath, audioBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadAttempt.error) {
      const errMsg = uploadAttempt.error.message || '';
      // If bucket might not exist yet, attempt auto-bucket creation and retry once
      if (errMsg.includes('Bucket not found') || errMsg.includes('not found') || errMsg.includes('does not exist')) {
        console.log('[Supabase Storage] Bucket not found during upload. Attempting auto-creation...');
        await audioStorageService.ensureBucket();
        uploadAttempt = await supabase.storage
          .from(AUDIO_BUCKET_NAME)
          .upload(storagePath, audioBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true,
          });
      }
    }

    if (uploadAttempt.error) {
      const storageErr = uploadAttempt.error as any;
      console.error('[Supabase Storage Error Diagnostics]', {
        ...diagnostics,
        errorName: storageErr.name,
        errorStatusCode: storageErr.statusCode || storageErr.status || storageErr.code,
        errorMessage: storageErr.message,
      });

      const errMessage = storageErr.message || '';
      let userMessage = "Speech was generated, but we couldn't securely save the audio. Please try again.";
      let statusCode = 500;
      let errorCode = 'AUDIO_STORAGE_UPLOAD_FAILED';

      if (errMessage.includes('Bucket not found') || errMessage.includes('not found') || errMessage.includes('does not exist')) {
        userMessage = "Audio storage is not configured correctly.";
        statusCode = 500;
        errorCode = 'AUDIO_STORAGE_BUCKET_MISSING';
      } else if (errMessage.includes('row-level security') || errMessage.includes('policy') || errMessage.includes('permission') || errMessage.includes('unauthorized') || errMessage.includes('403')) {
        userMessage = "TextFlow does not have permission to save this audio.";
        statusCode = 403;
        errorCode = 'AUDIO_STORAGE_PERMISSION_DENIED';
      } else if (errMessage.includes('JWT') || errMessage.includes('auth') || errMessage.includes('token')) {
        userMessage = "Your session expired. Please sign in again.";
        statusCode = 401;
        errorCode = 'AUTH_SESSION_EXPIRED';
      } else {
        userMessage = "Speech was generated, but audio storage is temporarily unavailable.";
        statusCode = 503;
        errorCode = 'AUDIO_STORAGE_UNAVAILABLE';
      }

      const err: any = new Error(userMessage);
      err.code = errorCode;
      err.statusCode = statusCode;
      err.details = errMessage;
      throw err;
    }

    console.log(`[Supabase Storage] Audio successfully saved to: ${storagePath} (${audioBuffer.length} bytes)`);

    return {
      storagePath,
      mimeType,
      sizeBytes: audioBuffer.length,
    };
  },

  /**
   * Generates a short-lived secure signed URL (default 3600 seconds = 1 hour) for private audio playback or download.
   */
  async createSignedUrl(
    storagePath: string,
    expiresInSeconds = 3600,
    token?: string
  ): Promise<string | null> {
    if (!storagePath || storagePath.trim() === '') {
      return null;
    }

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        console.warn(`[Supabase Storage] Failed to create signed URL for path ${storagePath}:`, error?.message);
        return null;
      }

      return data.signedUrl;
    } catch (err: any) {
      console.warn(`[Supabase Storage] Exception creating signed URL for ${storagePath}:`, err?.message);
      return null;
    }
  },

  /**
   * Deletes a single audio object from the private bucket.
   * Safe execution: does not throw if object is already missing.
   */
  async deleteAudioObject(storagePath: string, token?: string): Promise<boolean> {
    if (!storagePath || storagePath.trim() === '') {
      return true;
    }

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);
    if (!supabase) {
      return false;
    }

    try {
      const { error } = await supabase.storage.from(AUDIO_BUCKET_NAME).remove([storagePath]);
      if (error) {
        console.warn(`[Supabase Storage] Warning deleting object ${storagePath}:`, error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn(`[Supabase Storage] Exception deleting object ${storagePath}:`, err?.message);
      return false;
    }
  },

  /**
   * Deletes all audio objects belonging to a specific user inside audio/{userId}/.
   */
  async deleteUserAudioFolder(userId: string, token?: string): Promise<number> {
    if (!userId) return 0;

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);
    if (!supabase) {
      return 0;
    }

    try {
      const folderPrefix = `audio/${userId}`;
      const { data: fileList, error: listError } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .list(folderPrefix, { limit: 1000 });

      if (listError || !fileList || fileList.length === 0) {
        return 0;
      }

      const pathsToRemove = fileList
        .filter((item) => item.name && item.name !== '.emptyFolderPlaceholder')
        .map((item) => `${folderPrefix}/${item.name}`);

      if (pathsToRemove.length === 0) {
        return 0;
      }

      const { error: removeError } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .remove(pathsToRemove);

      if (removeError) {
        console.warn(`[Supabase Storage] Warning bulk removing files for user ${userId}:`, removeError.message);
        return 0;
      }

      console.log(`[Supabase Storage] Successfully deleted ${pathsToRemove.length} audio files for user ${userId}`);
      return pathsToRemove.length;
    } catch (err: any) {
      console.warn(`[Supabase Storage] Exception during deleteUserAudioFolder for user ${userId}:`, err?.message);
      return 0;
    }
  },

  /**
   * Downloads the raw audio buffer from Supabase Storage for server-side proxy or streaming.
   */
  async downloadAudioBuffer(
    storagePath: string,
    token?: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!storagePath) return null;

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .download(storagePath);

      if (error || !data) {
        console.warn(`[Supabase Storage] Download error for ${storagePath}:`, error?.message);
        return null;
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = data.type || (storagePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');

      return { buffer, mimeType };
    } catch (err: any) {
      console.warn(`[Supabase Storage] Exception downloading audio buffer for ${storagePath}:`, err?.message);
      return null;
    }
  },

  /**
   * Temporary safe diagnostic test method for Supabase Storage.
   */
  async runDiagnosticTest(userId: string, token?: string): Promise<{ success: boolean; details: any }> {
    const testHistoryId = 'diag_test_' + Date.now();
    const testPath = `audio/${userId}/${testHistoryId}/generated-audio.wav`;
    const testBuffer = Buffer.from('RIFF....WAVE', 'utf-8');
    const diagnostics: any = {
      authenticatedUserExists: !!userId,
      hasValidToken: !!token,
      bucketName: AUDIO_BUCKET_NAME,
      testPath,
      clientType: token ? 'user-scoped' : 'server',
    };

    const supabase = getUserSupabaseClient(token) || getServerSupabaseClient();
    if (!supabase) {
      console.error('[Supabase Storage Diagnostic] Failed: Client unavailable', diagnostics);
      return { success: false, details: { ...diagnostics, error: 'Supabase client unavailable' } };
    }

    try {
      console.log('[Supabase Storage Diagnostic] Starting test upload...', diagnostics);
      const { error: uploadErr } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .upload(testPath, testBuffer, { contentType: 'audio/wav', upsert: true });

      if (uploadErr) {
        const uErr = uploadErr as any;
        console.error('[Supabase Storage Diagnostic] Upload step failed:', {
          ...diagnostics,
          errorName: uErr.name,
          errorStatusCode: uErr.statusCode || uErr.status || uErr.error,
          errorMessage: uErr.message,
        });
        return { success: false, details: { ...diagnostics, step: 'upload', error: uErr.message, code: uErr.statusCode || uErr.status } };
      }

      const { data: signedData, error: signedErr } = await supabase.storage
        .from(AUDIO_BUCKET_NAME)
        .createSignedUrl(testPath, 60);

      if (signedErr || !signedData?.signedUrl) {
        console.error('[Supabase Storage Diagnostic] Signed URL step failed:', { ...diagnostics, error: signedErr?.message });
        return { success: false, details: { ...diagnostics, step: 'signedUrl', error: signedErr?.message } };
      }

      await supabase.storage.from(AUDIO_BUCKET_NAME).remove([testPath]);
      console.log('[Supabase Storage Diagnostic] All storage tests passed successfully!', diagnostics);

      return { success: true, details: { ...diagnostics, status: 'all_diagnostic_tests_passed', signedUrlGenerated: true } };
    } catch (err: any) {
      console.error('[Supabase Storage Diagnostic] Exception during test:', { ...diagnostics, exception: err?.message });
      return { success: false, details: { ...diagnostics, exception: err?.message } };
    }
  },
};
