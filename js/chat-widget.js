/**
 * CHAT WIDGET — Supabase Live Chat untuk DUKOPS
 * Floating Bottom-Right dengan Tema Hijau
 */

(function() {
    'use strict';

    // ================================================================
    // 1️⃣ KONFIGURASI SUPABASE — GANTI DENGAN MILIKMU!
    // ================================================================
    const SUPABASE_URL = 'https://xlpmsxcxkcznswwgpcof.supabase.co';
    const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscG1zeGN4a2N6bnN3d2dwY29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzQ0NzEsImV4cCI6MjA5NzQ1MDQ3MX0.32yiGrcybThwIcc2VQoI981DYZ_fKgXY_lxKMhIycZU';

    // ================================================================
    // 2️⃣ INISIALISASI
    // ================================================================
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const chatBox = document.getElementById('chatBox');
    const chatToggle = document.getElementById('chatToggle');
    const closeChat = document.getElementById('closeChat');
    const messagesArea = document.getElementById('chatMessagesArea');
    const messageInput = document.getElementById('chatMessageInput');
    const sendButton = document.getElementById('chatSendButton');
    const usernameEl = document.getElementById('chatUsername');
    const userCountEl = document.getElementById('chatUserCount');
    const typingIndicator = document.getElementById('chatTyping');
    const badge = document.getElementById('chatBadge');

    let myUsername = '';
    let typingTimeout = null;
    let isTypingChannel = null;
    let unreadCount = 0;
    let isChatOpen = false;
    let messagesChannel = null;
    let presenceChannel = null;

    // ================================================================
    // 3️⃣ USERNAME
    // ================================================================
    function getOrCreateUsername() {
        let username = localStorage.getItem('dukops_chat_username');
        if (!username) {
            const names = ['Budi', 'Siti', 'Andi', 'Rina', 'Doni', 'Maya', 'Joko', 'Dewi', 'Agus', 'Nina', 'Rizki',
                'Putri'];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomNum = Math.floor(Math.random() * 1000);
            username = `${randomName}_${randomNum}`;
            localStorage.setItem('dukops_chat_username', username);
        }
        return username;
    }

    myUsername = getOrCreateUsername();
    if (usernameEl) usernameEl.textContent = myUsername;

    // ================================================================
    // 4️⃣ FORMAT WAKTU
    // ================================================================
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    // ================================================================
    // 5️⃣ TOGGLE CHAT
    // ================================================================
    function openChat() {
        if (chatBox) chatBox.classList.add('open');
        isChatOpen = true;
        if (badge) {
            badge.classList.remove('show');
        }
        unreadCount = 0;
        setTimeout(() => {
            if (messageInput) messageInput.focus();
            scrollToBottom();
        }, 400);
    }

    function closeChatFn() {
        if (chatBox) chatBox.classList.remove('open');
        isChatOpen = false;
    }

    if (chatToggle) {
        chatToggle.addEventListener('click', () => {
            if (isChatOpen) {
                closeChatFn();
            } else {
                openChat();
            }
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', closeChatFn);
    }

    // ================================================================
    // 6️⃣ TAMPILKAN PESAN
    // ================================================================
    function appendMessage(msg, isOwn) {
        if (!messagesArea) return;

        const div = document.createElement('div');
        div.className = `chat-msg ${isOwn ? 'chat-msg-own' : 'chat-msg-other'}`;

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'msg-username';
        usernameSpan.textContent = isOwn ? 'Anda' : msg.username;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'msg-content';
        contentSpan.textContent = msg.content;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.textContent = formatTime(msg.created_at);

        div.appendChild(usernameSpan);
        div.appendChild(contentSpan);
        div.appendChild(timeSpan);

        // Hapus pesan sistem jika ada
        const systemMsg = messagesArea.querySelector('.chat-msg-system');
        if (systemMsg) systemMsg.remove();

        messagesArea.appendChild(div);

        // Update badge jika chat tertutup
        if (!isChatOpen && !isOwn) {
            unreadCount++;
            if (badge) {
                badge.textContent = unreadCount;
                badge.classList.add('show');
            }
        }

        scrollToBottom();
    }

    function appendSystemMessage(text) {
        if (!messagesArea) return;
        const div = document.createElement('div');
        div.className = 'chat-msg-system';
        div.textContent = text;
        messagesArea.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // ================================================================
    // 7️⃣ LOAD PESAN LAMA
    // ================================================================
    async function loadMessages() {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) {
                if (error.message && error.message.includes('relation "chat_messages" does not exist')) {
                    appendSystemMessage('⚠️ Tabel chat_messages belum dibuat!');
                    return;
                }
                throw error;
            }

            if (messagesArea) {
                // Hapus semua kecuali pesan sistem
                const systemMsg = messagesArea.querySelector('.chat-msg-system');
                messagesArea.innerHTML = '';
                if (systemMsg) messagesArea.appendChild(systemMsg);
            }

            if (!data || data.length === 0) {
                if (!messagesArea.querySelector('.chat-msg-system')) {
                    appendSystemMessage('🚀 Selamat datang di Live Chat DUKOPS!');
                }
                return;
            }

            // Hapus pesan sistem
            const systemMsg = messagesArea.querySelector('.chat-msg-system');
            if (systemMsg) systemMsg.remove();

            data.forEach(msg => {
                const isOwn = msg.username === myUsername;
                appendMessage(msg, isOwn);
            });

            scrollToBottom();
        } catch (error) {
            console.error('Gagal memuat pesan chat:', error);
            appendSystemMessage('⚠️ Gagal memuat pesan.');
        }
    }

    // ================================================================
    // 8️⃣ KIRIM PESAN
    // ================================================================
    async function sendMessage() {
        if (!messageInput) return;
        const content = messageInput.value.trim();
        if (!content) return;

        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Mengirim...';
        }

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert([{
                    username: myUsername,
                    content: content,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                if (error.message && error.message.includes('relation "chat_messages" does not exist')) {
                    appendSystemMessage('❌ Tabel chat_messages belum dibuat!');
                    return;
                }
                throw error;
            }

            messageInput.value = '';
            messageInput.focus();
            clearTyping();

        } catch (error) {
            console.error('Gagal kirim pesan chat:', error);
            appendSystemMessage('❌ Gagal mengirim pesan.');
        } finally {
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.textContent = 'Kirim';
            }
        }
    }

    // ================================================================
    // 9️⃣ REAL-TIME SUBSCRIBE
    // ================================================================
    function subscribeMessages() {
        messagesChannel = supabase
            .channel('chat-db-changes')
            .on(
                'postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                },
                (payload) => {
                    const newMsg = payload.new;
                    // Cegah duplikasi
                    if (messagesArea) {
                        const existing = messagesArea.querySelectorAll('.chat-msg .msg-content');
                        let isDuplicate = false;
                        for (const el of existing) {
                            if (el.textContent === newMsg.content) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        if (!isDuplicate) {
                            const isOwn = newMsg.username === myUsername;
                            appendMessage(newMsg, isOwn);
                        }
                    }
                }
            )
            .subscribe();

        return messagesChannel;
    }

    // ================================================================
    // 🔟 TYPING INDICATOR
    // ================================================================
    function setupTyping() {
        isTypingChannel = supabase.channel('chat-typing');

        isTypingChannel.on('broadcast', { event: 'typing' }, (payload) => {
            const sender = payload.payload.username;
            if (sender !== myUsername && typingIndicator) {
                typingIndicator.classList.add('show');
                typingIndicator.innerHTML = `
                    <span class="chat-typing-dots">
                        ${sender} mengetik<span>.</span><span>.</span><span>.</span>
                    </span>
                `;
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    if (typingIndicator) typingIndicator.classList.remove('show');
                }, 2000);
            }
        });

        isTypingChannel.subscribe();

        if (messageInput) {
            messageInput.addEventListener('input', () => {
                if (messageInput.value.trim().length > 0 && isTypingChannel) {
                    isTypingChannel.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { username: myUsername }
                    });
                }
            });
        }
    }

    function clearTyping() {
        if (typingIndicator) typingIndicator.classList.remove('show');
    }

    // ================================================================
    // 1️⃣1️⃣ ONLINE USERS (Presence)
    // ================================================================
    function setupPresence() {
        presenceChannel = supabase.channel('chat-online-users');

        presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const users = Object.keys(state);
            if (userCountEl) {
                userCountEl.textContent = `👥 ${users.length} online`;
            }
        });

        presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    username: myUsername,
                    online_at: new Date().toISOString()
                });
            }
        });

        return presenceChannel;
    }

    // ================================================================
    // 1️⃣2️⃣ INISIALISASI
    // ================================================================
    async function initChat() {
        try {
            await loadMessages();
            messagesChannel = subscribeMessages();
            setupTyping();
            presenceChannel = setupPresence();

            // Buka chat otomatis setelah 1 detik
            setTimeout(() => {
                openChat();
            }, 1500);

        } catch (error) {
            console.error('Chat init error:', error);
        }
    }

    // ================================================================
    // 1️⃣3️⃣ EVENT LISTENERS
    // ================================================================
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // ================================================================
    // 1️⃣4️⃣ CLEANUP
    // ================================================================
    window.addEventListener('beforeunload', () => {
        if (messagesChannel) supabase.removeChannel(messagesChannel);
        if (presenceChannel) supabase.removeChannel(presenceChannel);
        if (isTypingChannel) supabase.removeChannel(isTypingChannel);
    });

    // ================================================================
    // 1️⃣5️⃣ JALANKAN!
    // ================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }

    console.log('💬 Live Chat Widget DUKOPS siap!');
    console.log('👤 Username:', myUsername);

})();
