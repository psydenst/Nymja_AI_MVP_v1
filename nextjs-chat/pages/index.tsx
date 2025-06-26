import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactMarkdown from 'react-markdown'
import remarkGfm    from 'remark-gfm';
import remarkMath   from 'remark-math';
import rehypeKatex  from 'rehype-katex';
import { Copy } from 'lucide-react';
import { motion } from 'framer-motion'
import rehypeHighlight from 'rehype-highlight';
import styles from '../styles/Home.module.css';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import SearchList from '../components/SearchList';
import { MODEL_OPTIONS } from '../constants/ModelOptions'
import ModelMenu, { Mode } from '../components/ModelMenu';
import Image from 'next/image';
import { flushSync } from 'react-dom';
import {
  listConversations,
  refreshAccessToken,
  isAccessTokenValid,
  getValidAccessToken,
  markMessageSender, // auxiliary function to mark sender
  fetchFullConversation, // imported to fetch conversation history
  getBotResponse,      // function for bot response
  BotMessage,
  saveMessage,         // function to save a message
  logoutUser,          // function to log out user
	createDefaultConversation, // function to create a new conversation if none exists
  getMessageContainerStyle,
  getMessageWrapperStyle,
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
  const chatRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [model, setModel] = useState<string>('gemma');
  const [mode, setMode] = useState<Mode>('proxy');
  const [justCreatedConvId, setJustCreatedConvId] = useState<string|null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [iconSrc, setIconSrc] = useState('/send1.png');
  const [iconOpacity, setIconOpacity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = typeof window !== "undefined" && (
    /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  );
  const [currentBotMessageId, setCurrentBotMessageId] = useState<string | null>(null);
  const MotionCopy = motion(Copy)
  // Initialize accessToken from localStorage
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      console.log(localStorage.getItem('accessToken'));
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
          setJustCreatedConvId(defaultConv.id);
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

  // Handle image transition on send 
// inside your component, after declaring iconSrc and iconOpacity:
  const handleIconClick = () => {
    // trigger fade‐out
    setIconOpacity(0);

    // capture current src so closure is correct
    const currentlySendIcon = iconSrc === '/send1.png';
    // decide what the next src should be
    const nextSrc = currentlySendIcon ? '/icon_cancel.png' : '/send1.png';

    setTimeout(() => {
      // swap the icon
      setIconSrc(nextSrc);
      // trigger the appropriate action
      if (currentlySendIcon) {
        // we were on send → now start sending (and show cancel)
        sendMessage();
      } else {
        // we were on cancel → abort (and show send)
        cancelSend();
      }
      // fade back in
      setIconOpacity(1);
    }, 200); // match your CSS transition duration
  };
  

const cancelSend = async () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsSending(false);

    const conversationId = localStorage.getItem('conversationId');

    // Se não tem currentBotMessageId, busca na API o último message_id do bot!
    let messageIdToCancel = currentBotMessageId;
    if (!messageIdToCancel && conversationId) {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages/last_bot/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        });
        const data = await res.json();
        messageIdToCancel = data.id;
      } catch (e) {
        console.warn("Erro buscando last_bot_message_id:", e);
      }
    }

    // Agora manda o cancelamento pro backend, se tiver ID!
    if (messageIdToCancel && conversationId) {
      await fetch(`/api/conversations/${conversationId}/messages/cancel/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_id: messageIdToCancel }),
      });
    }

    setCurrentBotMessageId(null);
  }
};

const sendMessage = async () => {
  if (userMessage.trim() === '' || isSending) return;
  setIsSending(true);

  // 1️⃣ Grab and clear the input
  const messageToSend = userMessage;
  setUserMessage('');
  setInputBarHeight('6%');

  const conversationId = localStorage.getItem('conversationId');
  if (!conversationId) {
    console.error("No conversation id found. Make sure to create a conversation first.");
    setIsSending(false);
    return;
  }

  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    // 2️⃣ Send the user's message
    const userRes = await fetch(
      `/api/conversations/${conversationId}/messages/send/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: messageToSend }),
        credentials: 'include',
      }
    );
    if (!userRes.ok) {
      const err = await userRes.json();
      throw new Error(err.detail || 'Error sending message');
    }
    const userData = await userRes.json();
    setCurrentBotMessageId(userData.id);
    // 3️⃣ Add the user message to state
    setConversations(prev =>
      prev.map((conv, idx) =>
        idx === currentConversationIndex
          ? {
              ...conv,
              messages: [
                ...(conv.messages || []),
                { id: userData.id, text: messageToSend, sender: 'user' },
              ],
            }
          : conv
      )
    );

    // 4️⃣ Insert a placeholder for bot response with animated dots
    const placeholderId = `pending_${Date.now()}`;
    setConversations(prev =>
      prev.map((conv, idx) =>
        idx === currentConversationIndex
          ? {
              ...conv,
              messages: [
                ...(conv.messages || []),
                {
                  id: placeholderId,
                  text: '...',
                  sender: 'bot',
                  isTyping: true,
                },
              ],
            }
          : conv
      )
    );
    setIsSending(true);

    // 5️⃣ Stream the bot response…
    try {
      await getBotResponse(userData.id!, accessToken!, model, {
        onThinking: () => {
          console.log("Bot is thinking…");
          // keep showing “…” while thinking
        },
        onChunk: (chunk) => {
          console.log("Received chunk:", chunk);
          flushSync(() => {
            setConversations(prev =>
              prev.map((conv, idx) =>
                idx === currentConversationIndex
                  ? {
                      ...conv,
                      messages: conv.messages.map(msg => {
                        if (msg.id === placeholderId) {
                          if (msg.isTyping) {
                            return { ...msg, text: chunk, isTyping: false };
                          } else {
                            return { ...msg, text: msg.text + chunk };
                          }
                        }
                        return msg;
                      }),
                    }
                  : conv
              )
            );
          });
        },
        onComplete: (finalMessage) => {
          console.log("Streaming completed:", finalMessage);
          setConversations(prev =>
            prev.map((conv, idx) =>
              idx === currentConversationIndex
                ? {
                    ...conv,
                    messages: conv.messages.map(msg =>
                      msg.id === placeholderId
                        ? {
                            id: finalMessage.id,
                            text: finalMessage.text,
                            sender: 'bot',
                            created_at: finalMessage.created_at,
                            isTyping: false,
                          }
                        : msg
                    ),
                  }
                : conv
            )
          );
        },
        onError: (err) => {
          console.error("Stream error:", err);
          flushSync(() => {
            setConversations(prev =>
              prev.map((conv, idx) =>
                idx === currentConversationIndex
                  ? {
                      ...conv,
                      messages: conv.messages.map(msg =>
                        msg.id === placeholderId
                          ? {
                              ...msg,
                              text: `Error: ${err.message || "bot response failed"}`,
                              isError: true,
                              isTyping: false,
                            }
                          : msg
                      ),
                    }
                  : conv
              )
            );
          }, controller.signal);
        },
      });
    } catch (err: any) {
      // catch any errors thrown by getBotResponse itself
      console.error("Unexpected streaming failure:", err);
      flushSync(() => {
        setConversations(prev =>
          prev.map((conv, idx) =>
            idx === currentConversationIndex
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === placeholderId
                      ? {
                          ...msg,
                          text: `Error: ${err.message || "unknown error"}`,
                          isError: true,
                          isTyping: false,
                        }
                      : msg
                  ),
                }
              : conv
          )
        );
      });
    } finally {
      // always reset the sending flag when streaming ends/errors
      setIsSending(false);
    }

    const currentConv = conversations[currentConversationIndex];
    const needsRename =
      justCreatedConvId === conversationId ||
      currentConv.name === "Conversation 1";


    // 6️⃣ Name the conversation if it was just created
    if (needsRename) {
      try {
        const nameRes = await fetch(
          `/api/conversations/${conversationId}/name/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          }
        );
        if (nameRes.ok) {
          const updated = await nameRes.json();
          setConversations(prev =>
            prev.map(c =>
              c.id === conversationId ? { ...c, name: updated.name } : c
            )
          );
        } else {
          console.warn('NameConversation failed', await nameRes.text());
        }
      } catch (e) {
        console.error('Error naming conversation', e);
      } finally {
        setJustCreatedConvId(null);
      }
    }
  } catch (error) {
    // any other errors in sendMessage
    console.error('Error in sendMessage:', error);
    setIsSending(false);
  } 
};


  // Function to create New Conversation
  const startNewConversation = async () => {
      if (!accessToken) return;

      const defaultName = `Conversation ${conversations.length + 1}`;
      try {
        const res = await fetch('/api/conversations/create/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: defaultName }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to create conversation');
        const newConv = await res.json();

        // 1️⃣ add it to state and select it
        setConversations(prev => [{ ...newConv, messages: [] }, ...prev]);
        setCurrentConversationIndex(0);
        localStorage.setItem('conversationId', newConv.id);

        // 2️⃣ mark it so we’ll know to rename later
        setJustCreatedConvId(newConv.id);
      } catch (e) {
        console.error(e);
      }
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
          style={{minHeight: '25px'}}
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
                onClick={startNewConversation}
                {...(!isMobile && {
                  onMouseEnter: () => setIsHovered(true),
                  onMouseLeave: () => setIsHovered(false)
                })}
                style={{
                  transform: isHovered ? 'scale(1.3)' : 'scale(1.0)',
                  transition: 'transform 0.3s',
                  background: 'transparent',
                }}
                className={styles.addButton}
              >
                <img
                  src="/add.png"
                  alt="Add"
                  style={{
                    height: '25px',
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
                    const sender = markMessageSender(message)

                return (
                    <div
                      key={index}
                      className="my-2"
                      style={getMessageWrapperStyle(sender)}
                      ref={
                        index === currentMessages.length - 1
                          ? lastMessageRef
                          : null
                      }
                    >
                      <div 
                        className={`p-2 rounded ${sender === 'user' ? 'user-message' : 'bot-message'} ${message.isError ? 'text-danger' : ''}`}
                        style={getMessageContainerStyle(sender)}
                      >
                        {message.text === '...' ? (
                          <div
                            style={{
                              backgroundColor:
                                sender === 'user'
                                  ? 'rgba(72, 82, 96, 0.79)'
                                  : 'rgba(255, 255, 255, 0)',
                              color: '#E5EAFF',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                          >
                            <span className={styles.animatedDots}>
                              <span>.</span>
                              <span>.</span>
                              <span>.</span>
                            </span>
                          </div>                   
                          ) : (
                            <div
                              className={`markdown-body ${styles.markdown_body} ${message.isError ? 'text-danger' : ''}`} 
                              style={{
                                backgroundColor:
                                  sender === 'user'
                                    ? 'rgba(72, 82, 96, 0.79)'
                                    : 'rgba(255, 255, 255, 0)',
                                ...(message.isError ? {} : {color: '#E5EAFF'}),
                                padding: '8px 12px',
                                borderRadius: '4px',
                              }}
                            >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex, rehypeHighlight]}
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  // inline code: just style it normally
                                  if (inline) {
                                    return (
                                      <code
                                        className={className}
                                        style={{
                                          backgroundColor: '#000',
                                          color: '#fff',
                                          padding: '0.2em 0.4em',
                                          borderRadius: '3px',
                                          fontFamily: 'Menlo, Consolas, monospace',
                                        }}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  }

                                  // block code: add a copy button
                                  const codeRef = useRef<HTMLElement>(null);
                                  const copyToClipboard = () => {
                                    if (codeRef.current) {
                                      navigator.clipboard.writeText(codeRef.current.innerText);
                                    }
                                  };

                                  return (
                                    <div style={{ position: 'relative', margin: '8px 0' }}>
                                      {/* Copy button */}
                                      <button
                                        onClick={copyToClipboard}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        style={{
                                          position: 'absolute',
                                          top: '8px',
                                          right: '8px',
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: 0,
                                          outline: 'none',
                                          boxShadow: 'none',
                                          WebkitTapHighlightColor: 'transparent',
                                          /* make sure the element itself can't be selected/highlighted */
                                          WebkitUserSelect: 'none',
                                          userSelect: 'none',
                                        }}
                                        aria-label="Copy code"
                                      >
                                        <MotionCopy size={16} color="white" 
                                          whileHover={{ scale: 1.2, opacity: 0.8 }}
                                          whileTap={{ scale: 1.1 }}
                                          transition={{ type: 'spring', stiffness: 300 }}
                                        />
                                      </button>

                                      <pre
                                        ref={codeRef}
                                        className={className}
                                        style={{
                                          backgroundColor: '#000',
                                          color: '#fff',
                                          padding: '1em',
                                          borderRadius: '4px',
                                          overflowX: 'auto',
                                          fontFamily: 'Menlo, Consolas, monospace',
                                        }}
                                        {...props}
                                      >
                                        <code>{children}</code>
                                      </pre>
                                    </div>
                                  );
                                },
                                div({ className, children, ...props }: any) {
                                  if (className?.includes('katex-display')) {
                                    return (
                                      <div
                                        className={className}
                                        style={{
                                          backgroundColor: '#000',
                                          color: '#fff',
                                          padding: '1em',
                                          borderRadius: '4px',
                                          margin: '1em 0',
                                        }}
                                        {...props}
                                      >
                                        {children}
                                      </div>
                                    );
                                  }
                                  return <div className={className} {...props}>{children}</div>;
                                },
                                span({ className, children, ...props }: any) {
                                  if (className?.includes('katex')) {
                                    return (
                                      <span
                                        className={className}
                                        style={{
                                          backgroundColor: '#111',
                                          color: '#fff',
                                          padding: '0.1em 0.2em',
                                          borderRadius: '3px',
                                        }}
                                        {...props}
                                      >
                                        {children}
                                      </span>
                                    );
                                  }
                                  return <span className={className} {...props}>{children}</span>;
                                },
                                em({ node, children, ...props }: any) {
                                  return (
                                    <em
                                      {...props}
                                      style={{ margin: '0 0.2em' }}
                                    >
                                      {children}
                                    </em>
                                  )
                                },
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    )
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
                        const isMobile = typeof navigator !== 'undefined' &&
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                          .test(navigator.userAgent);

                        if (!isMobile) {
                          // Desktop → intercept the Enter, send, no newline
                          e.preventDefault();
                          sendMessage();
                        }
                        // Mobile → do nothing (Enter will insert a newline)
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
                <ModelMenu
                  models={MODEL_OPTIONS}
                  initialModel={model}
                  onModelChange={setModel}
                  currentMode={mode}
                  onModeChange={setMode}
                />
                <button
                  className="btn"
                  onClick={isSending ? cancelSend : sendMessage}
                  disabled={!isSending && userMessage.trim() === ''}
                  style={{
                    position: 'relative',
                    height: '25px',
                    width: '30px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  {/* Send icon (shows when isSending===false) */}
                  <Image
                    src="/send1.png"
                    alt="Send"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '25px',
                      width: 'auto',
                      filter: 'invert(100%)',
                      transition: 'opacity 0.6s ease',
                      opacity: isSending ? 0 : 1,
                    }}
                  />

                  {/* Cancel icon (shows when isSending===true) */}
                  <Image
                    src="/icon_cancel.png"
                    alt="Cancel"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: 'auto',
                      width: '30px',
                      filter: 'invert(100%)',
                      transition: 'opacity 0.6s ease',
                      opacity: isSending ? 1 : 0,
                    }}
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


