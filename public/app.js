import { auth, db, signOut, onAuthStateChanged, doc, collection, addDoc, query, orderBy, getDocs } from './firebase.js';
import { getAIResponse } from './ai.js';

const chatHistoryEl = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator-container');
const logoutBtn = document.getElementById('logout-btn');
const suggestions = document.querySelectorAll('.suggestion-chip');

let currentUser = null;
let conversationHistory = []; // Local state for context memory

// Helper: Format bold tags and line breaks
function formatAIResponse(text) {
    // Escape HTML first to prevent XSS
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Replace markdown bold with highlighted spans
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<span class="formatted-label">$1</span>');
    return safeText;
}

// Helper: Append message to UI
function appendMessage(role, content, saveToHistory = true) {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('message-wrapper', role);

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar', role);
    
    // Add specific icon to avatar based on role
    if (role === 'ai') {
        avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
    } else {
        avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('content');
    
    if (role === 'ai') {
        contentDiv.innerHTML = formatAIResponse(content);
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    wrapperDiv.appendChild(avatarDiv);
    wrapperDiv.appendChild(messageDiv);

    chatHistoryEl.appendChild(wrapperDiv);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // Save to conversation memory
    if (saveToHistory) {
        // Only keep last 10 messages for context window to save tokens
        conversationHistory.push({ role: role === 'ai' ? 'assistant' : 'user', content: content });
        if (conversationHistory.length > 10) {
            conversationHistory.shift(); 
        }
    }
}

// Handlers
async function handleSend(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    // Show user message
    appendMessage('user', text);
    messageInput.value = '';
    messageInput.style.height = 'auto'; // Reset resize

    // Show typing
    typingIndicator.classList.add('active');
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    sendBtn.disabled = true;

    // Fetch AI response
    const reply = await getAIResponse(conversationHistory);

    // Remove typing
    typingIndicator.classList.remove('active');
    sendBtn.disabled = false;

    // Show AI message
    appendMessage('ai', reply);

    // Save chat to Firestore optionally here
    if (currentUser) {
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'chats'), {
                userMsg: text,
                aiMsg: reply,
                timestamp: new Date().toISOString()
            });
        } catch(err) {
            console.error("Failed to save history", err);
        }
    }
}

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

chatForm.addEventListener('submit', handleSend);

if (suggestions) {
    suggestions.forEach(chip => {
        chip.addEventListener('click', () => {
            messageInput.value = chip.textContent;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
    });
}

// Authentication state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        // Initial Greeting logic
        const isNewUser = sessionStorage.getItem('isNewUser');
        const userName = user.displayName?.split(' ')[0] || '';

        if (isNewUser === 'true') {
            const greeting = "أهلاً بك في دليل، قبل أن نبدأ، ما اسمك؟";
            appendMessage('ai', greeting);
            sessionStorage.removeItem('isNewUser'); // greet only once
        } else if (conversationHistory.length === 0) {
            const greeting = `أهلاً بعودتك يا ${userName}! كيف يمكنني مساعدتك اليوم في التخطيط التربوي أو الأنشطة غير المنهجية؟`;
            appendMessage('ai', greeting);
        }

    } else {
        // Restrict access
        window.location.href = 'login.html';
    }
});
