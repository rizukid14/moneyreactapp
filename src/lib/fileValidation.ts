/**
 * fileValidation.ts
 * Utility for front-end secure file validation (Defense in Depth).
 * Checks File Size, Extensions, MIME Types, and Magic Bytes.
 */

export interface FileValidationOptions {
  maxSizeMB: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  checkMagicBytes?: 'image' | 'excel' | 'text';
}

const MAGIC_BYTES = {
  PNG: [0x89, 0x50, 0x4e, 0x47],
  JPEG: [0xff, 0xd8, 0xff],
  GIF: [0x47, 0x49, 0x46, 0x38], // 'GIF8'
  RIFF: [0x52, 0x49, 0x46, 0x46], // 'RIFF' (WebP container)
  XLSX: [0x50, 0x4b, 0x03, 0x04], // Actually a ZIP file magic number
  XLS: [0xd0, 0xcf, 0x11, 0xe0], // Legacy OLE format
};

function matchMagicBytes(bytes: Uint8Array, expected: number[]): boolean {
  if (bytes.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected[i]) return false;
  }
  return true;
}

export async function validateFileSecure(file: File, options: FileValidationOptions): Promise<{ isValid: boolean; error?: string }> {
  // 1. Size Limit Check
  const maxBytes = options.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { isValid: false, error: `Ukuran file terlalu besar. Maksimal adalah ${options.maxSizeMB}MB.` };
  }
  if (file.size === 0) {
    return { isValid: false, error: 'File kosong atau rusak.' };
  }

  // 2. Extension Check
  const fileNameParts = file.name.split('.');
  const extension = fileNameParts.length > 1 ? `.${fileNameParts.pop()?.toLowerCase()}` : '';
  if (!options.allowedExtensions.includes(extension)) {
    return { isValid: false, error: `Ekstensi file ${extension} tidak diizinkan. Hanya menerima: ${options.allowedExtensions.join(', ')}` };
  }

  // 3. Basic MIME Check (Note: easily spoofed, but good for first layer)
  const isMimeValid = options.allowedMimeTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0];
      return file.type.startsWith(`${baseType}/`);
    }
    return file.type === type;
  });

  // Empty MIME is only acceptable when a magic-byte check will follow (M13)
  if (file.type === '') {
    if (!options.checkMagicBytes) {
      return { isValid: false, error: 'Tipe file tidak dapat dipastikan.' };
    }
  } else if (!isMimeValid) {
    return { isValid: false, error: 'Tipe MIME file tidak sesuai dengan yang diizinkan.' };
  }

  // 4. Magic Bytes / Header Inspection
  if (options.checkMagicBytes) {
    try {
      const headerBlob = file.slice(0, 12);
      const arrayBuffer = await headerBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (options.checkMagicBytes === 'image') {
        const isPng = matchMagicBytes(bytes, MAGIC_BYTES.PNG);
        const isJpeg = matchMagicBytes(bytes, MAGIC_BYTES.JPEG);
        const isGif = matchMagicBytes(bytes, MAGIC_BYTES.GIF);
        const isWebp = matchMagicBytes(bytes, MAGIC_BYTES.RIFF) &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // 'WEBP'

        if (extension === '.png' && !isPng) return { isValid: false, error: 'File korup atau ekstensi disamarkan (Bukan PNG asli).' };
        if ((extension === '.jpg' || extension === '.jpeg') && !isJpeg) return { isValid: false, error: 'File korup atau ekstensi disamarkan (Bukan JPEG asli).' };
        if (extension === '.gif' && !isGif) return { isValid: false, error: 'File korup atau ekstensi disamarkan (Bukan GIF asli).' };
        if (extension === '.webp' && !isWebp) return { isValid: false, error: 'File korup atau ekstensi disamarkan (Bukan WebP asli).' };

        const isExe = bytes[0] === 0x4D && bytes[1] === 0x5A; // 'MZ'
        if (isExe) return { isValid: false, error: 'Terdeteksi file executable berbahaya.' };
      }

      if (options.checkMagicBytes === 'excel') {
        if (extension === '.xlsx') {
          const isZip = matchMagicBytes(bytes, MAGIC_BYTES.XLSX);
          if (!isZip) return { isValid: false, error: 'File bukan berformat Excel (.xlsx) yang valid.' };
        } else if (extension === '.xls') {
          const isOle = matchMagicBytes(bytes, MAGIC_BYTES.XLS);
          if (!isOle) return { isValid: false, error: 'File bukan berformat Excel (.xls) yang valid.' };
        } else if (extension === '.csv') {
          // CSV doesn't have a specific magic byte, but it shouldn't be an executable or ZIP
          const isZip = matchMagicBytes(bytes, MAGIC_BYTES.XLSX);
          const isExe = bytes[0] === 0x4D && bytes[1] === 0x5A;
          if (isZip || isExe) return { isValid: false, error: 'File CSV disamarkan.' };
        }
      }

      if (options.checkMagicBytes === 'text') {
        // Just verify it's not a known binary executable/archive
        const isZip = matchMagicBytes(bytes, MAGIC_BYTES.XLSX);
        const isExe = bytes[0] === 0x4D && bytes[1] === 0x5A;
        if (isZip || isExe) return { isValid: false, error: 'File teks berisi data biner yang mencurigakan.' };
      }

    } catch (error) {
      return { isValid: false, error: 'Gagal memindai keamanan struktur file.' };
    }
  }

  return { isValid: true };
}
