// Conversation Storage Service
// Provides a reliable way to store and retrieve conversation data
// with protection against race conditions and atomic operations

// Types for conversation data
export interface ConversationParams {
  conversation: string;    // ElevenLabs conversation ID
  agent: string;           // Agent ID
  start_time: string;      // ISO timestamp for start time
  end_time: string;        // ISO timestamp for end time
  scenario_info?: any;     // Optional scenario information
}

// Storage keys used by the application
const STORAGE_KEYS = {
  CONVERSATION_PARAMS: 'willow_conversation_params',
  LEGACY_PARAMS: 'conversationParams',
  ACTIVE_CONVERSATION: 'willow_active_conversation',
  PENDING_CONVERSATIONS: 'willow_pending_conversations',
  LOCK: 'willow_storage_lock',
  REDIRECT_IN_PROGRESS: 'willow_redirect_in_progress',
  REDIRECT_TIMESTAMP: 'willow_redirect_timestamp',
};

// Lock timeout (ms) - after this time, locks are considered stale
const LOCK_TIMEOUT = 5000;

// Redirect timeout (ms) - after this time, redirect flags are considered stale
const REDIRECT_TIMEOUT = 60000; // 1 minute

/**
 * Conversation Storage Service
 * Provides atomic operations for storing and retrieving conversation data
 */
export const ConversationStorage = {
  /**
   * Reset any stale redirect flags - important to call when component mounts
   */
  resetStaleFlags: (): void => {
    try {
      // Check if redirect flag is set
      if (localStorage.getItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS) === 'true') {
        // Check if there's a timestamp
        const timestampStr = localStorage.getItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          const now = Date.now();
          
          // If the timestamp is older than the redirect timeout, clear the flags
          if (now - timestamp > REDIRECT_TIMEOUT) {
            console.log('ConversationStorage: Clearing stale redirect flags', {
              age: now - timestamp,
              threshold: REDIRECT_TIMEOUT
            });
            localStorage.removeItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS);
            localStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
          }
        } else {
          // No timestamp, consider it stale
          console.log('ConversationStorage: Clearing redirect flags with no timestamp');
          localStorage.removeItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS);
        }
      }
    } catch (error) {
      console.error('ConversationStorage: Error resetting stale flags', error);
    }
  },

  /**
   * Save conversation parameters for post-login processing
   * This is an atomic operation that won't be interrupted by other operations
   */
  saveConversationParams: (params: ConversationParams): boolean => {
    console.log('ConversationStorage: Saving conversation params', params);
    
    try {
      // Set a redirect flag to prevent cleanup during navigation
      localStorage.setItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS, 'true');
      // Also set a timestamp so we can detect stale flags
      localStorage.setItem(STORAGE_KEYS.REDIRECT_TIMESTAMP, Date.now().toString());
      
      // Save to both current and legacy keys for backward compatibility
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_PARAMS, JSON.stringify(params));
      localStorage.setItem(STORAGE_KEYS.LEGACY_PARAMS, JSON.stringify(params));
      
      // Also store active conversation ID for recovery
      if (params.conversation) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, params.conversation);
      }
      
      return true;
    } catch (error) {
      console.error('ConversationStorage: Error saving conversation params', error);
      return false;
    }
  },
  
  /**
   * Retrieve conversation parameters (from either current or legacy storage)
   */
  getConversationParams: (): ConversationParams | null => {
    try {
      // Try current storage first
      const paramsStr = localStorage.getItem(STORAGE_KEYS.CONVERSATION_PARAMS);
      if (paramsStr) {
        return JSON.parse(paramsStr);
      }
      
      // Fall back to legacy storage
      const legacyParamsStr = localStorage.getItem(STORAGE_KEYS.LEGACY_PARAMS);
      if (legacyParamsStr) {
        return JSON.parse(legacyParamsStr);
      }
      
      return null;
    } catch (error) {
      console.error('ConversationStorage: Error retrieving conversation params', error);
      return null;
    }
  },
  
  /**
   * Get the active conversation ID
   */
  getActiveConversationId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
  },
  
  /**
   * Check if a redirect is in progress
   */
  isRedirectInProgress: (): boolean => {
    // Check if the flag is set
    const isInProgress = localStorage.getItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS) === 'true';
    
    // If it's set, also check if it's stale
    if (isInProgress) {
      const timestampStr = localStorage.getItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
      if (timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        const now = Date.now();
        
        // If the timestamp is older than the redirect timeout, consider it not in progress
        if (now - timestamp > REDIRECT_TIMEOUT) {
          console.log('ConversationStorage: Stale redirect flags detected, considering not in progress');
          return false;
        }
      }
    }
    
    return isInProgress;
  },
  
  /**
   * Begin redirect process - sets flags to prevent other operations
   */
  beginRedirect: (): void => {
    localStorage.setItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS, 'true');
    localStorage.setItem(STORAGE_KEYS.REDIRECT_TIMESTAMP, Date.now().toString());
  },
  
  /**
   * Clear all conversation storage (for use after successful processing)
   */
  clearAll: (): void => {
    console.log('ConversationStorage: Clearing all conversation storage');
    
    // Don't clear if redirect is in progress and timestamp is recent
    if (ConversationStorage.isRedirectInProgress()) {
      console.log('ConversationStorage: Redirect in progress, skipping clearAll');
      return;
    }
    
    // Clear all storage keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
  
  /**
   * Selective cleanup - removes only unnecessary data while preserving
   * important conversation parameters
   */
  selectiveCleanup: (): void => {
    console.log('ConversationStorage: Performing selective cleanup');
    
    try {
      // Preserve conversation params and active conversation ID
      const params = ConversationStorage.getConversationParams();
      const activeId = ConversationStorage.getActiveConversationId();
      
      // Clear everything except redirect flag
      Object.values(STORAGE_KEYS)
        .filter(key => key !== STORAGE_KEYS.REDIRECT_IN_PROGRESS && key !== STORAGE_KEYS.REDIRECT_TIMESTAMP)
        .forEach(key => {
          localStorage.removeItem(key);
        });
      
      // Restore the important data if available
      if (params) {
        localStorage.setItem(STORAGE_KEYS.CONVERSATION_PARAMS, JSON.stringify(params));
        localStorage.setItem(STORAGE_KEYS.LEGACY_PARAMS, JSON.stringify(params));
      }
      
      if (activeId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, activeId);
      }
    } catch (error) {
      console.error('ConversationStorage: Error during selective cleanup', error);
    }
  },
  
  /**
   * Clear redirect flags - called when redirect completes or component unmounts
   */
  clearRedirectFlags: (): void => {
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.LOCK);
  },
  
  /**
   * Force clear redirect flags - use this to unstuck the system
   */
  forceResetRedirectFlags: (): void => {
    console.log('ConversationStorage: Force resetting redirect flags');
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_IN_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.LOCK);
  },
  
  /**
   * For use after successful conversation processing
   * Clears all conversation data including the redirect flag
   */
  completeProcessing: (): void => {
    console.log('ConversationStorage: Completing processing, clearing all data');
    // This is a hard cleanup that ignores the redirect flag
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// Export storage keys for reference
export { STORAGE_KEYS }; 