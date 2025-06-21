/**
 * Image compression utility to reduce payload size for ballot submissions
 */

/**
 * Compress an image file to reduce its size
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Compressed image as base64 string
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 0.7,
      format = "image/jpeg",
    } = options;

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const compressedDataUrl = canvas.toDataURL(format, quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for compression"));
    };

    // Convert file to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Get the size of a base64 string in bytes
 * @param {string} base64String - Base64 encoded string
 * @returns {number} - Size in bytes
 */
export const getBase64Size = (base64String) => {
  if (!base64String) return 0;

  // Remove data URL prefix if present
  const base64Data = base64String.split(",")[1] || base64String;

  // Calculate size: each base64 character represents 6 bits
  // 4 base64 characters = 3 bytes, so multiply by 3/4
  const sizeInBytes = (base64Data.length * 3) / 4;

  // Subtract padding if present
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.floor(sizeInBytes - padding);
};

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Check if a file is an image
 * @param {File} file - File to check
 * @returns {boolean} - Whether the file is an image
 */
export const isImageFile = (file) => {
  return file && file.type && file.type.startsWith("image/");
};

/**
 * Compress multiple images and return a summary
 * @param {Object} images - Object with image files keyed by identifier
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} - Compressed images and compression summary
 */
export const compressMultipleImages = async (images, options = {}) => {
  const compressedImages = {};
  const compressionSummary = {
    originalSize: 0,
    compressedSize: 0,
    compressionRatio: 0,
    imageCount: 0,
  };

  for (const [key, imageData] of Object.entries(images)) {
    if (imageData && imageData.file && isImageFile(imageData.file)) {
      try {
        // Get original size
        const originalSize = imageData.file.size;
        compressionSummary.originalSize += originalSize;

        // Compress the image
        const compressedBase64 = await compressImage(imageData.file, options);
        const compressedSize = getBase64Size(compressedBase64);
        compressionSummary.compressedSize += compressedSize;
        compressionSummary.imageCount++;

        // Store compressed image
        compressedImages[key] = {
          ...imageData,
          compressedData: compressedBase64,
          originalSize,
          compressedSize,
          compressionRatio:
            originalSize > 0 ? compressedSize / originalSize : 0,
        };

        console.log(
          `Compressed ${key}: ${formatFileSize(
            originalSize
          )} → ${formatFileSize(compressedSize)}`
        );
      } catch (error) {
        console.error(`Failed to compress image ${key}:`, error);
        // Keep original if compression fails
        compressedImages[key] = imageData;
      }
    } else {
      // Not an image or no file, keep as is
      compressedImages[key] = imageData;
    }
  }

  // Calculate overall compression ratio
  compressionSummary.compressionRatio =
    compressionSummary.originalSize > 0
      ? compressionSummary.compressedSize / compressionSummary.originalSize
      : 0;

  console.log("Image compression summary:", {
    ...compressionSummary,
    originalSizeFormatted: formatFileSize(compressionSummary.originalSize),
    compressedSizeFormatted: formatFileSize(compressionSummary.compressedSize),
    spaceSaved: formatFileSize(
      compressionSummary.originalSize - compressionSummary.compressedSize
    ),
    compressionPercentage:
      Math.round((1 - compressionSummary.compressionRatio) * 100) + "%",
  });

  return {
    compressedImages,
    compressionSummary,
  };
};
