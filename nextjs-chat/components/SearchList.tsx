// nextjs-chat/components/SearchList.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import {
  fetchFullConversation,
  deleteConversation,
  logoutUser,              // ← import the logout helper
} from '../utils/utils';

interface Message {
  sender: string;
  text: string;
}

interface Conversation {
  id: string;
  user: string;
  name?: string;
  created_at: string;
  messages?: Message[];
}

interface SearchListProps {
  conversations: Conversation[];
  setCurrentConversationIndex: (index: number) => void;
  currentConversationIndex: number;
  updateConversation: (conversationId: string, fullConversationData: any) => void;
}

const SearchList: React.FC<SearchListProps> = ({
  conversations,
  setCurrentConversationIndex,
  currentConversationIndex,
  updateConversation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // ─── Logout handler (same as in index.tsx) ───────────────────────────
  const handleLogout = () => {
    logoutUser();           // clears tokens / JWT
    router.push('/login');  // redirect back to login
  };

  // Handle conversation click.
  const handleConversationClick = async (conversationId: string, sortedIndex: number) => {
    setCurrentConversationIndex(sortedIndex);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('Access token not found');
      return;
    }

    localStorage.setItem('conversationId', conversationId);

    try {
      const fullConversation = await fetchFullConversation(conversationId, token);
      updateConversation(conversationId, fullConversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Handle deletion of a conversation.
  const handleDeleteConversation = async (conversationId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await deleteConversation(conversationId, token);
      router.reload();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Filter & sort as before...
  const filteredConversations = conversations
    .map((conversation, index) => ({ conversation, index }))
    .filter(({ conversation }) => {
      if (!conversation.name?.trim()) return false;
      const term = searchTerm.toLowerCase();
      const nameMatches = conversation.name.toLowerCase().includes(term);
      const messagesMatch = (conversation.messages || []).some(m =>
        m.text.toLowerCase().includes(term)
      );
      return nameMatches || messagesMatch;
    });

  const sortedConversations = filteredConversations.sort((a, b) => {
    return (
      new Date(b.conversation.created_at).getTime() -
      new Date(a.conversation.created_at).getTime()
    );
  });

  return (
    <div
      className={`${styles.searchList_wrapper} d-flex flex-column align-items-center justify-content-center`}
    >
      {/* Search input */}
      <div
        className={`${styles.search_sidebar} d-flex align-items-center justify-content-start opacity-100`}
      >
        <div className="d-flex flex-row justify-content-between align-items-center">
          <img
            src="/search_white.png"
            alt="Search Icon"
            className="ms-3"
            style={{
              width: '1vw',
              height: '1vw',
              minWidth: '15px',
              minHeight: '15px',
              objectFit: 'cover',
              opacity: 0.6,
            }}
          />
          <input
            type="text"
            placeholder="Search"
            className={`${styles.search_input} w-100 text-white`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className={styles.inner_sidebar}>
        {sortedConversations.length > 0 && (
          <ul
            className={`${styles.history} h-100 w-100 bg-transparent rounded-0 list-group text-white opacity-75`}
          >
            {sortedConversations.map(({ conversation }, sortedIndex) => (
              <li
                key={conversation.id}
                className={`${styles.list_elements} w-100 d-flex justify-content-between align-items-center list-group-item text-white text-center border-0 opacity-50 ${
                  sortedIndex === currentConversationIndex
                    ? styles.activeConversation
                    : ''
                }`}
                onClick={() =>
                  handleConversationClick(conversation.id, sortedIndex)
                }
              >
                <span className={`opacity-100 ${styles.conversationName}`}>
                  {conversation.name}
                </span>
                <img
                  src="/delete.png"
                  alt="Delete"
                  style={{
                    width: '1.2vw',
                    minWidth: '15px',
                    cursor: 'pointer',
                    filter: 'invert(1)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Mobile‐only Logout Icon, same as index.tsx ───────────────────────── */}
      <div className={`d-block d-md-none mt-3`}>
        <div
          className={styles.accordion_mobile}
          onClick={handleLogout}
        >
          <img
            src="/logout_nymja_ai.png"
            alt="Logout"
            className={styles.arrow_mobile}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchList;


