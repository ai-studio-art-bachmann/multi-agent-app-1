import { v4 as uuidv4 } from 'uuid';

/**
 * Session and user ID management utility
 * Handles generating and storing unique identifiers for users and sessions
 */
export class SessionManager {
  private static USER_ID_KEY = 'tyokaveri_user_id';
  private static SESSION_ID_KEY = 'tyokaveri_session_id';
  
  /**
   * Get or create a user ID
   * Uses localStorage to persist the ID across browser sessions
   */
  static getUserId(): string {
    let userId = localStorage.getItem(this.USER_ID_KEY);
    
    if (!userId) {
      userId = `user-${uuidv4()}`;
      localStorage.setItem(this.USER_ID_KEY, userId);
    }
    
    return userId;
  }
  
  /**
   * Get or create a session ID
   * Uses sessionStorage to create a new ID for each browser session
   */
  static getSessionId(): string {
    let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
    
    if (!sessionId) {
      // Create a session ID with date prefix for easier tracking
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      sessionId = `sess-${datePart}-${uuidv4().slice(0, 8)}`;
      sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);
    }
    
    return sessionId;
  }
  
  /**
   * Get the current timestamp in ISO8601 format
   */
  static getTimestamp(): string {
    return new Date().toISOString();
  }
  
  /**
   * Get all session metadata in a single object
   */
  static getMetadata(): {
    userId: string;
    sessionId: string;
    timestamp: string;
  } {
    return {
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      timestamp: this.getTimestamp()
    };
  }
}
