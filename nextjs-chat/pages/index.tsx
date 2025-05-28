import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from '../styles/Home.module.css';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import SearchList from '../components/SearchList';
import Image from 'next/image';
import {
  listConversations,
  refreshAccessToken,
  isAccessTokenValid,
  getValidAccessToken,
  markMessageSender, // auxiliary function to mark sender
  fetchFullConversation, // imported to fetch conversation history
  getBotResponse,      // function for bot response
  saveMessage,         // function to save a message
  logoutUser,          // function to log out user
	createDefaultConversation, // function to create a new conversation if none exists
} from '../utils/utils';

export default function Home() {
  const [conversations, setConversations] = useState<any[]>([{ messages: [] }]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [userMessage, setUserMessage] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [showLogoutPanel, setShowLogoutPanel] = useState(false);
  const router = useRouter();
	const [isSending, setIsSending] = useState(false);
	const [inputBarHeight, setInputBarHeight] = useState('6%');
	const [isFocused, setIsFocused] = useState(false);
	const newlineCount = (userMessage.match(/\n/g) || []).length;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Initialize accessToken from localStorage
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  });

  // Toggle handler for the sidebar
  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Validate and refresh token on page load.
  useEffect(() => {
    async function validateToken() {
      try {
        const validToken = await getValidAccessToken();
        setAccessToken(validToken);
       // console.log("Valid token retrieved:", validToken);
      } catch (error) {
       // console.error("Unable to retrieve tokens", error);
        router.push('/login');
      }
    }
    validateToken();
  }, [router]);

  // Listen for changes in localStorage (for accessToken updates)
  useEffect(() => {
    const handleStorageChange = () => {
      setAccessToken(localStorage.getItem("accessToken"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch the conversation list when a valid accessToken is available.
  useEffect(() => {
    if (!accessToken || accessToken === 'undefined') {
      router.push('/login');
      return;
    }

    async function fetchConvos() {
			try {
				const data = await listConversations(accessToken);
				if (data.length === 0) {
					// No conversations exist—create a default conversation.
					const defaultConv = await createDefaultConversation(accessToken);
					setConversations([defaultConv]);
					localStorage.setItem('conversationId', defaultConv.id);
				} else {
					setConversations(data);
					localStorage.setItem('conversations', JSON.stringify(data));
				}
			//	console.log("Fetched conversations:", data);
			} catch (error) {
				console.error("Error fetching conversations:", error);
			}
		}
    fetchConvos();
  }, [accessToken, router]);

  // Callback to update the conversation with full data
	const updateConversation = (conversationId: string, fullConversationData: any) => {
		setConversations((prevConversations) =>
			prevConversations.map((conv) =>
				conv.id === conversationId ? { ...conv, messages: fullConversationData.messages } : conv
			)
		);
	};

  // Effect to fetch conversation history when the selected conversation changes
  useEffect(() => {
    async function fetchConversationHistory() {
      if (!accessToken) return;
      const selectedConversation = conversations[currentConversationIndex];
      if (!selectedConversation || !selectedConversation.id) return;

      // Only fetch if messages are undefined or empty.
      if (!selectedConversation.messages || selectedConversation.messages.length === 0) {
        try {
          const fullConversation = await fetchFullConversation(selectedConversation.id, accessToken);
        //  console.log('Fetched conversation history:', fullConversation);
          updateConversation(selectedConversation.id, fullConversation);
        } catch (error) {
          console.error("Error fetching conversation history:", error);
        }
      }
    }
    fetchConversationHistory();
  }, [currentConversationIndex, accessToken, conversations[currentConversationIndex]?.id]);

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target

    // 1️⃣ Auto-resize: reseta a altura e logo depois ajusta ao conteúdo
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`

    // 2️⃣ Atualiza o estado da mensagem
    const value = ta.value
    setUserMessage(value)

    // 3️⃣ Conta quebras de linha
    const newlineCount = (value.match(/\n/g) || []).length

    // 4️⃣ Lógica original de percentuais (chars vs newlines)
    let heightByChars: '6%' | '10%' | '22%' = '6%'
    if (value.length > 220) heightByChars = '22%'
    else if (value.length > 70) heightByChars = '10%'

    let heightByNewlines: '6%' | '10%' | '22%' = '6%'
    if (newlineCount >= 2) heightByNewlines = '22%'
    else if (newlineCount >= 1) heightByNewlines = '10%'

    let newHeight: '6%' | '10%' | '22%' = '6%'
    if (heightByChars === '22%' || heightByNewlines === '22%') {
      newHeight = '22%'
    } else if (heightByChars === '10%' || heightByNewlines === '10%') {
      newHeight = '10%'
    }

    // 5️⃣ Atualiza o estado do wrapper (.input_bar)
    setInputBarHeight(newHeight)
  }

	const sendMessage = async () => {
		if (userMessage.trim() === '' || isSending) return;
		
		setIsSending(true);
		
		// Save the current message and clear the input immediately.
		const messageToSend = userMessage;
		// Reset to null the textarea value
		setUserMessage('');
		// Reset input_bar to default size
		setInputBarHeight('6%');
		const conversationId = localStorage.getItem('conversationId');
		if (!conversationId) {
			console.error("No conversation id found. Make sure to create a conversation first.");
			setIsSending(false);
			return;
		}
		
		try {
			// Send the user's message.
			const response = await fetch(
				`/api/conversations/${conversationId}/messages/send/`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
					},
					body: JSON.stringify({ text: messageToSend }),
					credentials: 'include',
				}
			);
		
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Error sending message');
			}
		
			// Assume the returned data includes the user's message ID.
			const userMessageData = await response.json();
			// console.log('User message sent successfully:', userMessageData);
		
			// Update state: add the user's message.
			setConversations((prevConversations) =>
				prevConversations.map((conv, idx) => {
					if (idx === currentConversationIndex) {
						return {
							...conv,
							messages: [
								...(conv.messages || []),
								{ id: userMessageData.id, text: messageToSend, sender: 'user' },
							],
						};
					}
					return conv;
				})
			);
		
			// Immediately add a pending bot message placeholder.
			const pendingBotMessageId = "pending_" + Date.now();
			setConversations((prevConversations) =>
				prevConversations.map((conv, idx) => {
					if (idx === currentConversationIndex) {
						return {
							...conv,
							messages: [
								...(conv.messages || []),
								{ id: pendingBotMessageId, text: "...", sender: 'bot' },
							],
						};
					}
					return conv;
				})
			);
		
			// Call the bot response endpoint using the user's message ID.
			const token = localStorage.getItem('accessToken');
			const botResponseData = await getBotResponse(userMessageData.id, token);
		// 	console.log("Bot response received:", botResponseData);
		
			// Update state: replace the pending bot message with the actual bot response.
			setConversations((prevConversations) =>
				prevConversations.map((conv, idx) => {
					if (idx === currentConversationIndex) {
						return {
							...conv,
							messages: conv.messages.map((msg) =>
								msg.id === pendingBotMessageId ? { ...msg, text: botResponseData.text } : msg
							),
						};
					}
					return conv;
				})
			);
		
		} catch (error) {
			console.error('Error sending message to backend:', error);
		} finally {
			setIsSending(false);
		}
		
		setTimeout(() => {
			if (lastMessageRef.current) {
				lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
			}
		}, 100);
	};

  // Function to show the banner for new conversation
  const reload_page = () => {
    setShowBanner(true);
  };

  // Function to confirm the creation of a new conversation
	const createConversation = async () => {
		const name = newConversationName.trim() || `Conversation ${conversations.length + 1}`;
		setShowBanner(false);
		setNewConversationName('');
		
		try {
			const response = await fetch('api/conversations/create/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
				},
				body: JSON.stringify({ name }),
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Error saving conversation');
			}

			const result = await response.json();
			localStorage.setItem('conversationId', result.id);
			// console.log('Conversation saved:', result);
			
			// Prepend the new conversation (returned from the backend) to the list.
			setConversations((prevConversations) => [result, ...prevConversations]);
			// Set the current conversation index to 0 so the new conversation is active.
			setCurrentConversationIndex(0);
			setSaveError(null);
		} catch (error) {
			console.error('Error sending conversation to backend:', error);
			setSaveError('Failed to save conversation. Please try again.');
		}
	};

  const currentMessages = conversations[currentConversationIndex]?.messages || [];

  return (
    <div>
      <Head>
        <title>Nymja.AI</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>
			{/* Logout Button in the top-left corner */}
			<div className={styles.accordion} onClick={handleLogout}>
				<img
					src="/logout_nymja_ai.png"
					alt="Logout"
					className={styles.arrow}
				/>
			</div>

			<header
				className= {
					styles.header_class +
					' container-fluid w-100 d-flex justify-content-end align-items-start'
				}
				style={{ maxHeight: '1vh' }}
				>
			</header>

      <main>
        <div className={styles.container}>
          <div className="w-100 d-flex justify-content-center align-items-center">
          {/* Desktop SearchList congfig */}
            <div className={`${styles.searchListContainer} h-100 d-flex align-items-center mr-2`}> 
              <SearchList
                conversations={conversations}
                setCurrentConversationIndex={setCurrentConversationIndex}
                currentConversationIndex={currentConversationIndex}
                updateConversation={updateConversation}
              />
            </div>
            {/* Hamburger icon to toggle sidebar (visible on mobile/tablet) */}
            <div className={styles.sidebarToggle} onClick={toggleSidebar}>
              ☰
            </div>
            {/* Sidebar that will slide in on mobile/tablet */}
            <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
              <SearchList
                conversations={conversations}
                setCurrentConversationIndex={setCurrentConversationIndex}
                currentConversationIndex={currentConversationIndex}
                updateConversation={updateConversation}
              />
            </div>
            <div className={styles.cover_container}>
              <button
                onClick={reload_page}
                className={styles.addButton}
              >
                <img
                  src="/add.png"
                  alt="Add"
                  style={{
                    height: '2vw',
                    width: 'auto',
                    minHeight: '25px',
                    filter: 'invert(1)',
                    opacity: '0.5',
                  }}
                />
              </button>
              <div className={styles.chat_container} style={{ position: 'relative' }}>
                <div
                  className="p-3"
                  style={{
                    overflowY: 'auto',
                    height: 'calc(100% - 6vh)',
                    maxHeight: 'calc(100% - 6vh)',
                  }}
                >
                  {currentMessages.map((message, index) => {
                    const sender = markMessageSender(message);
                    return (
                      <div
                        key={index}
                        className={`my-2 d-flex ${
                          sender === 'user'
                            ? 'justify-content-end'
                            : 'justify-content-start'
                        }`}
                        ref={index === currentMessages.length - 1 ? lastMessageRef : null}
                      >
                        <div
                          className="p-2 rounded"
                          style={{
                            maxWidth: '70%',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            backgroundColor:
                              sender === 'user'
                                ? 'rgba(72, 82, 96, 0.79)'
                                : 'rgba(255, 255, 255, 0)',
                            color: '#E5EAFF',
                          }}
                        >
													{message.text === "..." ? (
														<span className={styles.animatedDots}>
															<span>.</span>
															<span>.</span>
															<span>.</span>
														</span>
													) : (
														<ReactMarkdown>{message.text}</ReactMarkdown>													)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  className={styles.logo_container}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: '0.1',
                  }}
                >
                  <svg
                    width="100"
                    height="24"
                    viewBox="0 0 86 24"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m17.7 21.7-5.1-19C12.2 1.1 10.8 0 9.2 0H3.6C1.6 0 0 1.6 0 3.6V24h6V2.4c0-.3.4-.4.5 0l5.1 19c.4 1.6 1.8 2.7 3.5 2.7h5.6c2 0 3.6-1.6 3.6-3.6V0h-6v21.6c0 .3-.4.4-.5 0ZM85.9 0h-3.3c-1.6 0-3 1.1-3.4 2.7l-5 18.7c-.2.7-1.1.7-1.3 0l-5-18.7C67.4 1.1 66 0 64.4 0h-5.6c-2 0-3.6 1.6-3.6 3.6V24h6V2.4c0-.3.4-.4.5 0l5.1 19c.4 1.6 1.8 2.7 3.5 2.7h6.4c1.6 0 3-1.1 3.5-2.7l5.1-19c0-.3.5-.2.5 0V24h6V3.6c0-2-1.6-3.6-3.6-3.6zM47.7 0l-6.9 12c-.3.5-1.1.5-1.4 0L32.6 0h-6.4l7 12.1c.5.9 1.5 1.4 2.5 1.4H40l-6 10.4h6.3L54.1 0h-6.3Z"></path>
                  </svg>
                </div>
              </div>
							<div
								className={`${styles.input_bar} d-flex align-items-center`}
							>
								<div style={{ position: 'relative', width: '100%'}}>
									{userMessage === '' && !isFocused && (
										<span className={styles.customPlaceholder}>
											Type a message...
										</span>
									)}
									<textarea
                    ref={textareaRef}
                    rows={1}
										className={`${styles.transparent_input} flex-grow-1 d-flex align-items-center`}
										value={userMessage}
										onChange={handleInputChange}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault(); // Prevents newline insertion
												sendMessage();
											}
										}}
										onFocus={() => setIsFocused(true)}
										onBlur={() => setIsFocused(false)}
										style={{
											border: 'none',
											outline: 'none',
											backgroundColor: 'transparent',
											color: '#E5EAFF',
											padding: '0',
											marginRight: '10px',
											flexGrow: 1,
											resize: 'none',
											height: '100%',// fill the container
											width: '95%',
											overflow: newlineCount >= 2 ? 'auto' : 'hidden',
										}}
									/>
								</div>
								<button
									className="btn"
									onClick={sendMessage}
									disabled={isSending} // disables btn while sending
									style={{
										backgroundColor: 'transparent',
										border: 'none',
										outline: 'none',
										padding: '0',
									}}
								>
									<Image
										src="/send1.png"
										alt="Send"
										style={{ width: '25px', height: '25px', filter: 'invert(100%)', }}
									/>
								</button>
							</div>
           </div>
          </div>
        </div>

        {/* Squared grey banner overlay */}
        {showBanner && (
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '62.5%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'grey',
              padding: '20px',
              borderRadius: '10px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h3 style={{ color: '#fff', marginBottom: '10px' }}>Label your conversation:</h3>
            <input
              type="text"
              value={newConversationName}
              onChange={(e) => setNewConversationName(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '5px',
                border: 'none',
                outline: 'none',
                width: '200px',
                textAlign: 'center',
              }}
              placeholder="Conversation name"
            />
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={createConversation}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '5px',
                  backgroundColor: '#444',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowBanner(false);
                  setNewConversationName('');
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '5px',
                  backgroundColor: '#999',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


