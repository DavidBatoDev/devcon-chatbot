import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage, { Message } from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { generateBotResponse } from '@/services/chatService';
import DevconLogo from './DevconLogo';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Interface for chat memory
interface ChatMemory {
  userName?: string;
  userData: Record<string, any>;
  lastInteraction: Date;
  messages: Message[];
}
const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatMemory, setChatMemory] = useState<ChatMemory>({
    userData: {},
    lastInteraction: new Date(),
    messages: []
  });

  // Initialize chat and load history/memory from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('devcon-chat-history');
    const savedMemory = localStorage.getItem('devcon-chat-memory');

    // Set initial welcome message if no history exists
    if (!savedMessages) {
      const welcomeMessage: Message = {
      id: 'welcome',
      content: [
        "**🎉 Hey there, Officer! 🎉**",
        "Welcome aboard the **DEVCON Chapter Officers’ Onboarding Bot** — your cheerful sidekick on this exciting tech adventure! 💻✨",
        "",
        "I’m here to help you kickstart your journey with:",
        "- 📋 **Checklists** to keep you on track",
        "- 📚 **Guides and best practices**",
        "- 🛠️ **Tools** to lead your chapter smoothly",
        "- 🎯 **Tips** to turn ideas into action",
        "",
        "So buckle up, future tech leader — your chapter is waiting, and I’ve got your back every step of the way.",
        "**Ready to roll? Let’s do this! 🚀😄**"
      ].join("\n"),
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } else {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        const messagesWithDateObjects = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDateObjects);
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
        // Set default message if parsing fails
        const welcomeMessage: Message = {
          id: 'welcome',
          content: "👋 Hello, Welcome aboard the DEVCON Chapter Officers’ Onboarding Bot — your cheerful sidekick on this exciting tech adventure!",
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    }

    // Load memory if exists
    if (savedMemory) {
      try {
        const parsedMemory = JSON.parse(savedMemory);
        // Ensure messages array exists in memory
        if (!parsedMemory.messages) {
          parsedMemory.messages = [];
        }
        setChatMemory({
          ...parsedMemory,
          lastInteraction: new Date(parsedMemory.lastInteraction),
          messages: parsedMemory.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        });
      } catch (error) {
        console.error('Failed to parse saved memory:', error);
      }
    }
  }, []);

  // Update memory whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Update memory with the latest messages (up to 10)
      setChatMemory(prevMemory => ({
        ...prevMemory,
        messages: messages.slice(-10),
        lastInteraction: new Date()
      }));
    }
  }, [messages]);

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('devcon-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  // Save memory to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('devcon-chat-memory', JSON.stringify(chatMemory));
  }, [chatMemory]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Extract user name from messages
  const extractUserInfo = (content: string) => {
    // Check for name introduction patterns
    const nameIntroPatterns = [/my name is (\w+)/i, /i am (\w+)/i, /i'm (\w+)/i, /call me (\w+)/i, /name's (\w+)/i];
    for (const pattern of nameIntroPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const name = match[1];
        // Update memory with user name
        setChatMemory(prev => ({
          ...prev,
          userName: name,
          lastInteraction: new Date()
        }));
        return name;
      }
    }
    return null;
  };
  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date()
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsTyping(true);

    // Process message for potential user information
    const extractedName = extractUserInfo(content);
    try {
      // Update chatMemory with the user message before sending to API
      const updatedMemory = {
        ...chatMemory,
        messages: [...chatMemory.messages, userMessage].slice(-10)
      };

      // Get bot response using API, passing the memory context
      const botResponse = await generateBotResponse(content, updatedMemory);

      // Update memory with last interaction
      setChatMemory(prev => ({
        ...prev,
        lastInteraction: new Date()
      }));

      // Personalize response if name is known
      if (chatMemory.userName || extractedName) {
        const name = extractedName || chatMemory.userName;
        const personalizedResponse = {
          ...botResponse,
          content: botResponse.content.replace(/^(Hi|Hello|Hey)( there)?!/i, `$1${name ? ` ${name}` : ''}!`)
        };
        setMessages(prevMessages => [...prevMessages, personalizedResponse]);
      } else {
        setMessages(prevMessages => [...prevMessages, botResponse]);
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive"
      });

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I encountered an error. Please try again.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Clear chat history and memory
  const clearChatHistory = () => {
    setMessages([{
      id: 'welcome',
      content: [
        "**🎉 Hey there, Officer! 🎉**",
        "Welcome aboard the **DEVCON Chapter Officers’ Onboarding Bot** — your cheerful sidekick on this exciting tech adventure! 💻✨",
        "",
        "I’m here to help you kickstart your journey with:",
        "- 📋 **Checklists** to keep you on track",
        "- 📚 **Guides and best practices**",
        "- 🛠️ **Tools** to lead your chapter smoothly",
        "- 🎯 **Tips** to turn ideas into action",
        "",
        "So buckle up, future tech leader — your chapter is waiting, and I’ve got your back every step of the way.",
        "**Ready to roll? Let’s do this! 🚀😄**"
      ].join("\n"),
      role: 'assistant',
      timestamp: new Date()
    }]);

    // Reset memory but keep the username if available
    setChatMemory({
      userName: chatMemory.userName,
      // Preserve the username
      userData: {},
      lastInteraction: new Date(),
      messages: [] // Add the missing messages property as an empty array
    });
    localStorage.removeItem('devcon-chat-history');
    localStorage.setItem('devcon-chat-memory', JSON.stringify({
      userName: chatMemory.userName,
      userData: {},
      lastInteraction: new Date(),
      messages: [] // Also add here
    }));
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been cleared."
    });
  };
  return <div className="flex flex-col h-screen bg-gradient-to-b from-devcon-background to-devcon-background/90">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border backdrop-blur-md bg-black/30 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <DevconLogo />
        </div>
        
        <button onClick={clearChatHistory} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors bg-black/20 px-3 py-1 rounded-full">
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => <ChatMessage key={message.id} message={message} isLatest={index === messages.length - 1} />)}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-border backdrop-blur-md bg-black/30 py-4">
        <div className="w-full max-w-3xl mx-auto px-4">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isTyping} />
        </div>
      </div>
    </div>;
};
export default ChatInterface;