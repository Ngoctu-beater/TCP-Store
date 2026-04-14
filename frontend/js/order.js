document.addEventListener("DOMContentLoaded", () => {
  let myOrdersData = [];
  loadMyOrders();
});

// Hàm format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Hàm format ngày giờ
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Cấu hình màu sắc theo trạng thái đơn hàng
const statusConfig = {
  PENDING: { text: "Chờ xác nhận", color: "text-yellow-600" },
  CONFIRMED: { text: "Đã xác nhận", color: "text-blue-600" },
  SHIPPING: { text: "Đang vận chuyển", color: "text-orange-600" },
  DELIVERED: { text: "Hoàn thành", color: "text-sale-red" },
  CANCELLED: { text: "Đã hủy", color: "text-gray-500" },
};

// Gọi API tải danh sách đơn hàng
async function loadMyOrders() {
  if (!AuthUtils.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const container = document.getElementById("orders-container");
  container.innerHTML = `<div class="p-8 text-center text-gray-500 font-medium">Đang tải danh sách đơn hàng...</div>`;

  try {
    const token = AuthUtils.getToken();
    const response = await fetch(`${AppConfig.ORDER_API_URL}/my-orders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Không thể tải đơn hàng");

    const orders = await response.json();
    myOrdersData = orders;

    // Xử lý khi chưa có đơn hàng nào
    if (!orders || orders.length === 0) {
      container.innerHTML = `
                <div class="bg-white dark:bg-[#1e2125] p-12 text-center rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">receipt_long</span>
                    <p class="text-gray-500 text-lg mb-4">Bạn chưa có đơn hàng nào.</p>
                    <a href="home.html" class="px-6 py-3 bg-primary text-[#101818] font-bold rounded-xl hover:bg-primary/90 transition-colors">Mua sắm ngay</a>
                </div>
            `;
      return;
    }

    // Đổ dữ liệu
    container.innerHTML = orders
      .map((order) => {
        const status =
          statusConfig[order.orderStatus] || statusConfig["PENDING"];

        // Generate HTML cho danh sách sản phẩm trong đơn hàng này
        const itemsHtml = order.items
          .map(
            (item) => `
                <div class="p-4 md:p-6 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-[#25282c]/50 transition-colors cursor-pointer" onclick="window.location.href='payment_success.html?orderCode=${order.orderCode}'">
                  <div class="flex gap-4">
                    <div class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md bg-white dark:bg-[#25282c] flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 p-2">
                      ${
                        item.productThumbnail
                          ? `<img src="${item.productThumbnail}" alt="${item.productName}" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" onerror="this.src='https://placehold.co/100?text=No+Img'" />`
                          : `<span class="material-symbols-outlined text-gray-300 text-4xl">inventory_2</span>`
                      }
                    </div>
                    <div class="flex-1 flex flex-col sm:flex-row gap-4">
                      <div class="flex-1">
                        <h3 class="text-base font-medium text-[#101818] dark:text-white line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                          ${item.productName}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Số lượng: x${item.quantity}</p>
                      </div>
                      <div class="flex flex-row sm:flex-col items-center sm:items-end justify-center gap-2 sm:gap-1 shrink-0">
                        <span class="text-base font-bold text-sale-red">${formatCurrency(item.unitPrice)}</span>
                        
                        ${
                          order.orderStatus === "DELIVERED"
                            ? `
                            <button onclick="event.stopPropagation(); openReviewModal(${item.productId}, '${item.productName.replace(/'/g, "\\'")}', '${item.productThumbnail || ""}', ${order.id})" class="mt-2 px-4 py-1.5 border border-primary text-primary hover:bg-primary hover:text-[#101818] text-sm font-semibold rounded-lg transition-colors">
                                Đánh giá
                            </button>
                        `
                            : ""
                        }
                        
                      </div>
                    </div>
                  </div>
                </div>
            `,
          )
          .join("");

        // Trả về HTML cho cả Khối đơn hàng
        return `
            <div class="bg-white dark:bg-[#1e2125] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden group">
                <div class="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[#101818] dark:text-white">Mã đơn: #${order.orderCode || order.id}</span>
                        <span class="text-gray-300 mx-1">|</span>
                        <span class="text-sm text-gray-500">${formatDate(order.createdAt)}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1 text-primary font-medium text-sm">
                            <span class="material-symbols-outlined text-[18px]">local_shipping</span>
                            TCPStore Giao Hàng
                        </div>
                        <div class="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <span class="${status.color} text-sm font-bold uppercase">${status.text}</span>
                    </div>
                </div>
                
                ${itemsHtml}

                <div class="bg-[#fafafa] dark:bg-[#1a1d21] p-4 md:p-6">
                    <div class="flex flex-col items-end gap-2 border-b border-dashed border-gray-200 dark:border-gray-700 pb-4 mb-4 w-full">
                        <div class="w-full flex justify-end items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>Tạm tính:</span>
                            <span class="text-[#101818] dark:text-white">${formatCurrency(order.subTotal)}</span>
                        </div>
                        <div class="w-full flex justify-end items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>Phí vận chuyển:</span>
                            <span class="text-[#101818] dark:text-white">${order.shippingFee === 0 ? "Miễn phí" : formatCurrency(order.shippingFee)}</span>
                        </div>
                        <div class="w-full flex justify-end items-center gap-2 mt-2">
                            <span class="text-sm text-gray-500 dark:text-gray-400">Tổng số tiền:</span>
                            <span class="text-2xl font-bold text-sale-red">${formatCurrency(order.totalAmount)}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                            <a href="payment_success.html?orderCode=${order.orderCode || order.id}" class="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors bg-white dark:bg-[#25282c] min-w-[140px] text-center">
                                Xem chi tiết
                            </a>
                            
                            ${
                              order.orderStatus === "PENDING"
                                ? `<button onclick="cancelOrder('${order.orderCode || order.id}')" class="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-sm transition-colors min-w-[140px]">
                                      Hủy đơn hàng
                                   </button>`
                                : `<button onclick="buyAgain('${order.orderCode || order.id}', this)" class="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-[#101818] font-bold text-sm transition-colors shadow-sm min-w-[140px]">
                                      Mua lại
                                   </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi:", error);
    container.innerHTML = `<div class="p-8 text-center text-red-500">Có lỗi xảy ra khi tải danh sách đơn hàng.</div>`;
  }
}
// HÀM HỦY ĐƠN HÀNG
async function cancelOrder(orderCode) {
  if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;

  try {
    const token = AuthUtils.getToken();
    const response = await fetch(
      `${AppConfig.ORDER_API_URL}/${orderCode}/cancel`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      alert("Đã hủy đơn hàng thành công!");
      loadMyOrders(); // Tải lại danh sách đơn hàng để cập nhật giao diện
    } else {
      const errorText = await response.text();
      alert("Không thể hủy: " + errorText);
    }
  } catch (error) {
    console.error("Lỗi khi hủy đơn:", error);
    alert("Lỗi kết nối đến máy chủ!");
  }
}

// HÀM MUA LẠI ĐƠN HÀNG
async function buyAgain(orderIdentifier, btnElement) {
  // Tìm đơn hàng
  const order = myOrdersData.find(
    (o) => (o.orderCode || o.id).toString() === orderIdentifier.toString(),
  );
  if (!order || !order.items || order.items.length === 0) {
    alert("Không tìm thấy dữ liệu sản phẩm của đơn hàng này!");
    return;
  }

  // Đổi giao diện nút thành Loading
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm align-middle">sync</span> Đang xử lý...`;
  btnElement.disabled = true;

  try {
    const token = AuthUtils.getToken();

    // THÊM TUẦN TỰ TỪNG SẢN PHẨM VÀO GIỎ HÀNG
    let successCount = 0;

    for (const item of order.items) {
      const response = await fetch(`${AppConfig.CART_API_URL}/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        console.warn(`Không thể thêm sản phẩm ${item.productName} vào giỏ.`);
      }
    }

    // Kiểm tra kết quả
    if (successCount === 0) {
      alert(
        "Rất tiếc, các sản phẩm này hiện không thể thêm vào giỏ hàng (Có thể đã hết hàng).",
      );
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
      return;
    }

    if (successCount < order.items.length) {
      alert(
        `Đã thêm ${successCount}/${order.items.length} sản phẩm vào giỏ. Một số sản phẩm có thể đã hết hàng.`,
      );
    }

    // Chuyển hướng sang trang giỏ hàng
    window.location.href = "shopping_cart.html";
  } catch (error) {
    console.error("Lỗi khi Mua lại:", error);
    alert("Không thể kết nối đến máy chủ. Vui lòng thử lại!");

    // Phục hồi lại nút nếu bị lỗi
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}

// ĐÁNH GIÁ SẢN PHẨM
let currentReviewProductId = null;
let currentReviewOrderId = null;

// Hàm mở Popup
function openReviewModal(productId, productName, productImg, orderId) {
  currentReviewProductId = productId;
  currentReviewOrderId = orderId;

  document.getElementById("review-product-info").innerHTML = `
        <img src="${productImg || "https://placehold.co/100?text=No+Img"}" class="w-12 h-12 object-cover rounded mix-blend-multiply dark:mix-blend-normal border border-gray-200 dark:border-gray-700">
        <p class="text-sm font-bold text-[#101818] dark:text-white line-clamp-2">${productName}</p>
    `;

  setRating(5); // Mặc định 5 sao
  document.getElementById("review-comment").value = "";
  document.getElementById("review-modal").classList.remove("hidden");
}

// Hàm đóng Popup
function closeReviewModal() {
  document.getElementById("review-modal").classList.add("hidden");
}

// Hàm xử lý chọn sao
function setRating(stars) {
  document.getElementById("review-rating").value = stars;
  const starElements = document.querySelectorAll("#star-rating span");

  starElements.forEach((el, index) => {
    if (index < stars) {
      el.className =
        "material-symbols-outlined cursor-pointer text-yellow-400 filled text-4xl transition-transform hover:scale-110";
    } else {
      el.className =
        "material-symbols-outlined cursor-pointer text-gray-300 text-4xl transition-transform hover:scale-110";
    }
  });
}

// Hàm Gửi đánh giá xuống Backend
async function submitReview(btnElement) {
  const rating = document.getElementById("review-rating").value;
  const comment = document.getElementById("review-comment").value;

  if (!comment.trim()) {
    alert("Vui lòng nhập nhận xét của bạn về sản phẩm!");
    return;
  }

  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = `<span class="material-symbols-outlined animate-spin align-middle text-sm">sync</span> Đang gửi...`;
  btnElement.disabled = true;

  // SỬ DỤNG ĐÚNG HÀM VÀ KEY TỪ COMMON.JS ĐỂ LẤY DỮ LIỆU
  const rName = AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
  const rAvatar = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR) || "";

  try {
    const token = AuthUtils.getToken();

    // DÙNG BIẾN MÔI TRƯỜNG THAY VÌ GẮN CỨNG LOCALHOST
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/${currentReviewProductId}/reviews`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: currentReviewOrderId,
          rating: parseInt(rating),
          comment: comment,
          reviewerName: rName,
          reviewerAvatar: rAvatar,
        }),
      },
    );

    if (response.ok) {
      alert("Cảm ơn bạn đã đánh giá sản phẩm!");
      closeReviewModal();
    } else {
      const errorText = await response.text();
      alert("Không thể gửi đánh giá: " + errorText);
    }
  } catch (error) {
    console.error("Lỗi gửi đánh giá:", error);
    alert("Lỗi kết nối mạng!");
  } finally {
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}
