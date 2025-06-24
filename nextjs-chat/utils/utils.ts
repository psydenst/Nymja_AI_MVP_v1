import * as jwtDecodeModule from 'jwt-decode';
// Convert the module default export to unknown, then cast it as a callable function.
const jwtDecode = (jwtDecodeModule.default as unknown) as (token: string) => any;

interface JwtPayload {
  exp: number;
}

export interface ConversationData {
  id: string;
  messages: any[];
}

export interface BotMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  conversation: string
  // …any other fields your serializer returns…
}


// fetch and return a list all user's conversations (id, created_at, name)
export async function listConversations(userToken: string | null): Promise<any[]> {
  if (!userToken) {
    throw new Error("User token is missing");
  }

  try {
    const response = await fetch('/api/conversations/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      credentials: 'include',
    });
    // console.log('DEBUG: ', userToken);


    if (response.status === 204) {
      return []; 
    }

		if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error getting conversations');
    }

    const result = await response.json();
   // console.log('Fetched conversations:', result);
    return result;
  } catch (error) {
    console.error('Error fetching conversations from backend:', error);
    throw error;
  }
}

// extracts conversation IDs from the conversations array and stores them in localStorage.
export function storeConversationIds(conversations: any[]): void {
  if (typeof window !== 'undefined') {
    const conversationIds = conversations.map((conversation) => conversation.id);
    localStorage.setItem('conversationIds', JSON.stringify(conversationIds));
    // console.log('Stored conversation IDs:', conversationIds);
  }
}


export async function fetchFullConversation(
  conversationId: string,
  userToken: string | null
): Promise<ConversationData> {
  if (!userToken) {
    throw new Error("User token is missing");
  }

  try {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        credentials: 'include',
      }
    );

    if (response.status === 204) {
      // No messages exist, so return an object with the conversation ID and an empty array.
      return { id: conversationId, messages: [] };
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error fetching full conversation messages');
    }

    const result = await response.json();
   // console.log('Fetched full conversation:', result);
    // Assuming the API returns an array of messages, wrap it with the conversation id.
    return { id: conversationId, messages: result };
  } catch (error) {
    console.error('Error fetching full conversation:', error);
    throw error;
  }
}


/**
 * Refreshes the access token using the refresh token.
 * Expects the refresh token to be stored in localStorage under "refreshToken".
 * Returns the new access token on success and saves it to localStorage.
 *
 * Note: Typically, your refresh token remains valid until it expires or is revoked.
 * Only update it if your backend sends a new refresh token.
 */
export async function refreshAccessToken(): Promise<string> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!accessToken || !refreshToken) {
    throw new Error("Tokens are missing.");
  }

  const response = await fetch("/api/auth/token/refresh/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh: refreshToken }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to refresh token");
  }

  const data = await response.json();
  localStorage.setItem("accessToken", data.access);
  // console.log("Access token refreshed:", data.access);
  return data.access;
}

export function decodeJwtToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    // The payload is the second part of the token
    const payload = parts[1];
    // Replace URL-safe characters, then decode from Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode the base64 string (using atob which is available in browsers)
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT token manually:", error);
    throw error;
  }
}



/**
 * Checks if the provided access token is valid by decoding it.
 * IMPORTANT obs: This function is not secure and should not be used in production.
 * Change to server-side py views approach.
 * Returns true if the token has not expired, false otherwise.
 */
export function isAccessTokenValid(token: string): boolean {
  try {
    const decoded = decodeJwtToken((token)) as JwtPayload;
    return decoded.exp * 1000 > Date.now();
  } catch (error) {
    console.error("Error decoding token:", error);
    return false;
  }
}

/**
 * Helper function to ensure a valid access token.
 * If the current access token is invalid or expired, it attempts to refresh it.
 * Returns a valid access token.
 */
export async function getValidAccessToken(): Promise<string> {
  let token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("No access token found.");
  }
  if (!isAccessTokenValid(token)) {
    console.log("Access token is invalid or expired. Refreshing...");
    token = await refreshAccessToken();
  }
  return token;
}

/**
 * Bot or user?
 */
export function markMessageSender(message: any): 'user' | 'bot' {
  // For example, if message.sender exists then return it; otherwise assume it's from the bot.
  return message.sender ? message.sender : 'bot';
}

/**
 * Calls the BotResponse endpoint for a given user message ID.
 * Assumes the endpoint is: GET /api/conversations/<message_id>/messages/response/
 */

export async function getBotResponse(
  messageId: string,
  userToken: string | null,
  modelKey : string = 'deepseek',
  options?: { signal?: AbortSignal }      // ← new 4th param
): Promise<any> {
  if (!userToken) {
    throw new Error("User token is missing");
  }

  try {
    const response = await fetch(
      `/api/conversations/${messageId}/messages/response/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
        model: modelKey,
        }),
        signal: options?.signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error fetching bot response");
    }

    const result = await response.json();
    // console.log("Fetched bot response:", result);
    return result; // Expected to include the bot's response text (e.g. result.text)
  } catch (error: any) {
    console.error("Error fetching bot response:", error);
    throw error;
  }
}

/**
 * Saves a message (bot or user) to the conversation using the send endpoint.
 * Uses the endpoint: POST /api/conversations/<conversation_id>/messages/send/
 */
export async function saveMessage(
  conversationId: string,
  messageText: string,
  userToken: string | null,
  sender: string = 'user'
): Promise<any> {
  if (!userToken) {
    throw new Error("User token is missing");
  }

  try {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages/send/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ text: messageText, sender }),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error saving message");
    }

    const result = await response.json();
   //  console.log("Saved message:", result);
    return result;
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
}


/**
 * Erases the access token and refresh token from localStorage.
 * Logout
 */
export function logoutUser(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("conversationId");
  localStorage.removeItem("conversations");
 // console.log("User logged out.");
}

// Create a default conversation if user has no conversations yet. 
export async function createDefaultConversation(userToken: string | null): Promise<any> {
  if (!userToken) {
    throw new Error("User token is missing");
  }

  try {
    // Call the conversation creation endpoint with the default name.
    const response = await fetch('/api/conversations/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "Conversation 1" }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error creating default conversation");
    }

    const result = await response.json();
   // console.log("Default conversation created:", result);
    return result;
  } catch (error) {
    console.error("Error creating default conversation:", error);
    throw error;
  }
}

export async function deleteConversation(
  conversationId: string,
  userToken: string | null
): Promise<boolean> {
  if (!userToken) {
    throw new Error("User token is missing");
  }
  try {
    const response = await fetch(
      `/api/conversations/${conversationId}/delete/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        credentials: 'include',
      }
    );
    
    if (response.status === 204) {
      //console.log("Conversation deleted successfully");
      return true;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error deleting conversation");
    }
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}


/*****************************************/
/*****************************************/
// CHAT CONTAINER STYLING HELPER FUNCTIONS
/*****************************************/
/*****************************************/

/**
 * Checks if the current device is mobile based on screen width
 * @param breakpoint - The breakpoint width to consider as mobile (default: 768px)
 * @returns boolean indicating if device is mobile
 */
export const isMobileDevice = (breakpoint: number = 768): boolean => {
  return window.innerWidth <= breakpoint;
};

/**
 * Calculates the appropriate width for chat messages based on device type and sender
 * @param sender - The message sender ('user' or 'bot')
 * @param mobileBreakpoint - The breakpoint width to consider as mobile (default: 768px)
 * @returns string representing the width percentage
 */
export const getMessageWidth = (sender: string, mobileBreakpoint: number = 768): string => {
  const isMobile = isMobileDevice(mobileBreakpoint);
  
  if (isMobile) {
    return sender === 'user' ? '70%' : '95%';
  }
  
  // Desktop: both user and bot 70%
  return '70%';
};

/**
 * Gets the complete style object for message containers
 * @param sender - The message sender ('user' or 'bot')
 * @param mobileBreakpoint - The breakpoint width to consider as mobile (default: 768px)
 * @returns object with width and maxWidth properties
 */
export const getMessageContainerStyle = (sender: string, mobileBreakpoint: number = 768) => {
  const isMobile = isMobileDevice(mobileBreakpoint);
  
  // Calculate max width based on device and sender
  let maxWidth: string;
  if (isMobile) {
    maxWidth = sender === 'user' ? '70%' : '95%';
  } else {
    maxWidth = '70%';
  }
  
  return {
    maxWidth,
    width: 'auto' // Let content determine width up to max
  };
};

/**
 * Gets the complete style object for message wrapper containers (the flex container)
 * @param sender - The message sender ('user' or 'bot')
 * @returns object with display, justifyContent, and width properties
 */
export const getMessageWrapperStyle = (sender: string) => {
  const baseStyle = {
    display: 'flex',
    width: '100%',
    margin: '0.5rem 0'
  };

  if (sender === 'user') {
    return {
      ...baseStyle,
      justifyContent: 'flex-end'
    };
  } else {
    return {
      ...baseStyle,
      justifyContent: 'flex-start'
    };
  }
};


