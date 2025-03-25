import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { fetchFullConversation, deleteConversation } from '../utils/utils';

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

  // Handle conversation click.
  const handleConversationClick = async (conversationId: string, sortedIndex: number) => {
    console.log('Clicked conversation ID:', conversationId);
    setCurrentConversationIndex(sortedIndex);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('Access token not found');
      return;
    }

    localStorage.setItem('conversationId', conversationId);

    try {
      const fullConversation = await fetchFullConversation(conversationId, token);
      console.log('Fetched conversation:', fullConversation);
      updateConversation(conversationId, fullConversation);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Handle deletion of a conversation.
  const handleDeleteConversation = async (conversationId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await deleteConversation(conversationId, token);
      // Option: Reload the page to update the conversation list.
      router.reload();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Filter conversations by search term.
  const filteredConversations = conversations
    .map((conversation, index) => ({ conversation, index }))
    .filter(({ conversation }) => {
      if (!conversation.name || conversation.name.trim() === '') {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const conversationName = conversation.name.toLowerCase();
      const nameMatches = conversationName.includes(term);

      const messagesMatch = (conversation.messages || []).some((message) =>
        (message.text || '').toLowerCase().includes(term)
      );

      return nameMatches || messagesMatch;
    });

  // Sort the filtered conversations by created_at (newest first).
  const sortedConversations = filteredConversations.sort((a, b) => {
    const dateA = new Date(a.conversation.created_at).getTime();
    const dateB = new Date(b.conversation.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <div className={`${styles.sidebar} d-flex flex-column align-items-center justify-content-center`}>
      <div className={`${styles.search_sidebar} d-flex align-items-center justify-content-center opacity-100`}>
        <div className="d-flex flex-row justify-content-center align-items-center flex-start">
          <img
            src="/search_white.png"
            style={{
              width: '1vw',
              height: '1vw',
              minHeight: '15px',
              minWidth: '15px',
              objectFit: 'cover',
              marginLeft: '1vw',
              opacity: '0.6',
            }}
            alt="Search Icon"
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
      <div className={styles.inner_sidebar}>
        {sortedConversations.length > 0 ? (
          <ul className={`${styles.history} h-100 w-100 bg-transparent rounded-0 list-group text-white align-items-center justify-content-start opacity-75`}>
            {sortedConversations.map(({ conversation }, sortedIndex) => (
              <li
                key={conversation.id}
                className={`${styles.list_elements} w-100 d-flex justify-content-between align-items-center list-group-item text-white text-center border-0 opacity-50 ${
                  sortedIndex === currentConversationIndex ? styles.activeConversation : ''
                }`}
                onClick={() => handleConversationClick(conversation.id, sortedIndex)}
              >
                <span className={styles.conversationName}>{conversation.name}</span>
                <img
                  src="/delete.png"
                  alt="Delete"
                  style={{
                    width: '1.2vw',
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
        ) : null}
      </div>
    </div>
  );
};

export default SearchList;


