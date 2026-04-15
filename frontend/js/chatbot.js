const CHAT_SESSION_KEY = "chat_history";
let isChatHistoryLoaded = false;

// Đóng/Mở cửa sổ chat
function toggleChat() {
  const chatWindow = document.getElementById("chat-window");
  const toggleBtn = document.getElementById("chat-toggle-btn");

  if (chatWindow.classList.contains("hidden")) {
        chatWindow.classList.remove("hidden");
        toggleBtn.style.display = "none";
        document.getElementById("chat-input").focus();
        
        // Tải lịch sử khi mở chat lần đầu
        if (!isChatHistoryLoaded) {
            loadSessionHistory();
            isChatHistoryLoaded = true;
        } else {
            scrollToBottom();
        }
    } else {
        chatWindow.classList.add("hidden");
        toggleBtn.style.display = "flex";
    }
}

// Tải lịch sử từ Session Storage
function loadSessionHistory() {
    const history = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || "[]");
    const chatMessages = document.getElementById("chat-messages");

    if (history.length > 0) {
        history.forEach(msg => {
            if (msg.sender === "user") {
                appendMessage("user", msg.text);
            } else {
                const typingId = appendMessage("bot", msg.text);
                if (msg.products && msg.products.length > 0) {
                    updateMessage(typingId, msg.text, msg.products);
                }
            }
        });
        scrollToBottom();
    }
}

// Lưu tin nhắn vào Session
function saveToSession(sender, text, products = []) {
    const history = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || "[]");
    history.push({ sender, text, products });
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(history));
}

// Bắt sự kiện nhấn phím Enter
function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

function scrollToBottom() {
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return charsToReplace[tag] || tag;
  });
}

function formatAIText(text) {
  if (!text) return "";
  
  // Mã hóa an toàn trước để chống XSS từ nguồn ngoài
  let safeText = escapeHTML(text);
  
  // Sau đó mới parse markdown
  return safeText
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

// Vẽ danh sách Card sản phẩm UI
function generateProductCardsHtml(products) {
  if (!products || products.length === 0) return "";

  let cardsHtml = products
    .map((p) => {
      let imgUrl = p.thumbnail || p.imageUrl || "https://via.placeholder.com/150";
      let safeName = escapeHTML(p.name);

      return `
        <a href="product_detail.html?id=${p.id}" class="block min-w-[150px] max-w-[160px] flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:shadow-md hover:border-primary transition-all cursor-pointer text-left no-underline group">
            <img src="${imgUrl}" alt="${safeName}" class="w-full h-32 object-cover rounded mb-2 group-hover:scale-105 transition-transform">
            <h4 class="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1" title="${safeName}">${safeName}</h4>
            <p class="text-sm font-bold text-[#d70018]">${UIUtils.formatCurrency(p.salePrice)}</p>
            <div class="flex items-center mt-1">
                <span class="text-yellow-400 text-[10px]">★★★★★</span>
            </div>
        </a>
      `;
    })
    .join("");

  // Chỉ hiển thị mũi tên nếu có nhiều hơn 1 sản phẩm
  const showArrows = products.length > 1;

  // Nút cuộn trái
  const leftArrow = showArrows ? `
    <button 
      onclick="this.nextElementSibling.scrollBy({ left: -160, behavior: 'smooth' })"
      class="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full shadow-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110 transition-all cursor-pointer"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_left</span>
    </button>
  ` : "";

  // Nút cuộn phải
  const rightArrow = showArrows ? `
    <button 
      onclick="this.previousElementSibling.scrollBy({ left: 160, behavior: 'smooth' })"
      class="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full shadow-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110 transition-all cursor-pointer"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_right</span>
    </button>
  ` : "";

  return `
    <div class="relative group flex items-center mt-3 w-full">
        ${leftArrow}
        
        <div class="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth w-full pb-2">
            ${cardsHtml}
        </div>
        
        ${rightArrow}
    </div>
  `;
}

// Hàm gửi tin nhắn
async function sendMessage() {
  const inputEl = document.getElementById("chat-input");
  const sendBtn = inputEl.nextElementSibling;
  const message = inputEl.value.trim();

  if (!message) return;

  // Khóa ô nhập liệu
  inputEl.disabled = true;
  sendBtn.disabled = true;
  inputEl.classList.add("opacity-50", "cursor-not-allowed");
  sendBtn.classList.add("opacity-50", "cursor-not-allowed");

  // In tin nhắn User
  appendMessage("user", message);
  saveToSession("user", message); 
  inputEl.value = "";

  // In bong bóng chờ
  const typingId = appendMessage(
    "bot",
    '<span class="animate-pulse font-bold tracking-widest">...</span>'
  );

  // Lây tên người dùng để gửi kèm
  const currentUserName = AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "";

  try {
    const response = await fetch(`${AppConfig.PRODUCT_API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, userName: currentUserName }),
    });

    if (response.ok) {
      const data = await response.json();
      const formattedReply = formatAIText(data.reply);

      updateMessage(typingId, formattedReply, data.products);
      saveToSession("bot", formattedReply, data.products);
    } else {
      updateMessage(
        typingId,
        "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé."
      );
    }
  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    updateMessage(typingId, "Lỗi kết nối đến máy chủ.");
  } finally {
    // Mở khóa ô nhập liệu
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.classList.remove("opacity-50", "cursor-not-allowed");
    sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    setTimeout(() => inputEl.focus(), 100);
  }
}

// Hàm vẽ tin nhắn lên UI
function appendMessage(sender, text) {
  const chatMessages = document.getElementById("chat-messages");
  const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const isUser = sender === "user";

  const html = `
    <div id="${msgId}" class="flex flex-col ${isUser ? "items-end" : "items-start"} mb-4">
        <div class="message-content ${isUser ? "bg-primary text-[#101818] rounded-bl-lg rounded-tl-lg rounded-tr-lg" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-br-lg rounded-tr-lg rounded-tl-lg border border-gray-300 dark:border-gray-600"} p-3 max-w-[85%] break-words shadow-sm leading-relaxed">
            ${text}
        </div>
    </div>
  `;

  chatMessages.insertAdjacentHTML("beforeend", html);
  scrollToBottom();
  return msgId;
}

// Hàm cập nhật nội dung tin nhắn
function updateMessage(id, newText, products = []) {
  const msgEl = document.getElementById(id);
  if (msgEl) {
    const contentDiv = msgEl.querySelector(".message-content");
    if (contentDiv) {
      contentDiv.innerHTML = newText;

      // NẾU CÓ SẢN PHẨM TRẢ VỀ -> VẼ THÊM XUỐNG DƯỚI BONG BÓNG
      if (products && products.length > 0) {
        const cardsHtml = generateProductCardsHtml(products);
        msgEl.insertAdjacentHTML(
          "beforeend",
          `<div class="w-full max-w-[85%]">${cardsHtml}</div>`
        );
      }
    }
    setTimeout(scrollToBottom, 50); 
  }
}