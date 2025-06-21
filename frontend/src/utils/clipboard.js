/**
 * Clipboard utility that works on both HTTP and HTTPS
 * Provides fallback methods when navigator.clipboard is not available
 */

/**
 * Copy text to clipboard with fallback for HTTP sites
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    // First try the modern clipboard API (requires HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback method for HTTP sites
    return fallbackCopyTextToClipboard(text);
  } catch (error) {
    console.warn("Clipboard API failed, trying fallback method:", error);
    return fallbackCopyTextToClipboard(text);
  }
};

/**
 * Fallback method to copy text using document.execCommand
 * Works on HTTP sites and older browsers
 * @param {string} text - Text to copy
 * @returns {boolean} - Success status
 */
const fallbackCopyTextToClipboard = (text) => {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Make it invisible but still selectable
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.setAttribute("readonly", "");
    textArea.setAttribute("tabindex", "-1");

    // Add to DOM, select, copy, and remove
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error("Fallback copy method failed:", error);
    return false;
  }
};

/**
 * Check if clipboard functionality is available
 * @returns {boolean} - Whether clipboard is supported
 */
export const isClipboardSupported = () => {
  return !!(navigator.clipboard || document.execCommand);
};

/**
 * Get user-friendly message about clipboard support
 * @returns {string} - Status message
 */
export const getClipboardSupportMessage = () => {
  if (navigator.clipboard && window.isSecureContext) {
    return "Clipboard API available (HTTPS)";
  } else if (document.execCommand) {
    return "Fallback clipboard method available (HTTP)";
  } else {
    return "Clipboard not supported in this browser";
  }
};
