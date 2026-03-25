let currentCartData = null;

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  fillCustomerInfo();
});

// Hàm format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// TẢI GIỎ HÀNG TỪ API
async function loadCart() {
  // AuthUtils
  const token = AuthUtils.getToken();
  if (!token) {
    // Nếu chưa đăng nhập, không làm gì hoặc redirect
    return;
  }

  try {
    const response = await fetch(AppConfig.CART_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 403 || response.status === 401) {
      // Token hết hạn
      AuthUtils.logout();
      return;
    }

    if (response.ok) {
      currentCartData = await response.json();
      renderCartItems(currentCartData.items);
      renderCartSummary(currentCartData);
    }
  } catch (error) {
    console.error("Lỗi tải giỏ hàng:", error);
  }
}

// RENDER DANH SÁCH SẢN PHẨM
function renderCartItems(items) {
  const container = document.getElementById("cart-items-container");
  const emptyCartEl = document.getElementById("empty-cart-message");
  const cartContentEl = document.getElementById("cart-content-wrapper");
  const selectAllCheckbox = document.getElementById("select-all");

  // Xử lý giỏ hàng trống
  if (!items || items.length === 0) {
    if (cartContentEl) cartContentEl.classList.add("hidden");
    if (emptyCartEl) emptyCartEl.classList.remove("hidden");
    renderCartSummary({ totalItems: 0, totalAmount: 0 });

    // Reset nút chọn tất cả nếu giỏ rỗng
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    return;
  }

  if (cartContentEl) cartContentEl.classList.remove("hidden");
  if (emptyCartEl) emptyCartEl.classList.add("hidden");

  // --- LOGIC CẬP NHẬT NÚT CHỌN TẤT CẢ ---
  if (selectAllCheckbox) {
    // Kiểm tra xem tất cả các item có đang được tick không
    const isAllSelected = items.every((item) => item.isSelected);
    selectAllCheckbox.checked = isAllSelected;

    // Cập nhật text hiển thị
    const labelSelectAll = document.querySelector('label[for="select-all"]');
    if (labelSelectAll) {
      labelSelectAll.innerText = `Chọn tất cả (${items.length} sản phẩm)`;
    }
  }

  // Render từng item
  container.innerHTML = items
    .map((item) => {
      // --- TÍNH % GIẢM GIÁ ---
      let discountHtml = "";
      let basePriceHtml = "";

      if (item.basePrice && item.basePrice > item.price) {
        const percent = Math.round(
          ((item.basePrice - item.price) / item.basePrice) * 100,
        );
        discountHtml = `<span class="bg-sale-red/10 text-sale-red text-[10px] font-bold px-2 py-0.5 rounded">-${percent}%</span>`;
        basePriceHtml = `<div class="text-sm text-gray-400 line-through">${formatCurrency(item.basePrice)}</div>`;
      }

      // --- HIỂN THỊ MÀU SẮC ---
      let colorHtml = "";
      if (
        item.selectedColor &&
        item.selectedColor !== "null" &&
        item.selectedColor.trim() !== ""
      ) {
        colorHtml = `<span class="text-gray-500 dark:text-gray-400 text-sm"> | Màu: ${item.selectedColor}</span>`;
      }

      // --- HIỂN THỊ TỒN KHO ---
      let stockHtml = "";
      if (item.stock > 0) {
        stockHtml = `<p class="text-xs text-orange-500 font-medium mt-1">Còn ${item.stock} sản phẩm</p>`;
      } else {
        stockHtml = `<p class="text-xs text-red-500 font-medium mt-1">Hết hàng</p>`;
      }

      // --- HTML ---
      return `
        <div class="bg-white dark:bg-[#1e2125] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative group hover:border-primary/30 transition-all duration-300">
            <button onclick="removeCartItem(${item.id})" class="absolute top-4 right-4 text-gray-400 hover:text-sale-red transition-colors p-2 z-10">
                <span class="material-symbols-outlined">delete</span>
            </button>

            <div class="flex flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <div class="shrink-0 flex items-center self-center sm:self-center h-full">
                    <input 
                        type="checkbox" 
                        ${item.isSelected ? "checked" : ""} 
                        onchange="updateCartItem(${item.id}, null, this.checked)"
                        class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-[#25282c] dark:border-gray-600 cursor-pointer"
                    />
                </div>

                <div class="flex flex-col sm:flex-row gap-6 flex-1">
                    <div class="w-full sm:w-32 aspect-square bg-[#f8fcfc] dark:bg-[#25282c] rounded-xl flex items-center justify-center p-2 shrink-0">
                        <img 
                            src="${item.productThumbnail || "https://placehold.co/100"}" 
                            alt="${item.productName}" 
                            class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                            onerror="this.src='https://placehold.co/100?text=No+Img'"
                        />
                    </div>

                    <div class="flex-1 flex flex-col justify-between gap-4">
                        <div>
                            <div class="flex flex-wrap gap-2 mb-2">
                                <span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">Sản phẩm</span>
                                ${discountHtml}
                            </div>

                            <h3 class="text-lg font-bold text-[#101818] dark:text-white leading-snug mb-1">
                                <a href="product-detail.html?id=${item.productId}" class="hover:text-primary transition-colors">
                                    ${item.productName}
                                </a>
                            </h3>
                            
                            <div class="flex items-center flex-wrap gap-1">
                                <span class="text-sm text-gray-500 dark:text-gray-400">SKU: ${item.skuId || "N/A"}</span>
                                ${colorHtml}
                            </div>

                            ${stockHtml}
                        </div>

                        <div class="flex items-end justify-between flex-wrap gap-4">
                            <div class="flex items-center bg-[#f0f5f5] dark:bg-[#25282c] rounded-lg p-1">
                                <button onclick="updateCartItem(${item.id}, ${item.quantity - 1}, null)" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-[#1e2125] transition-colors text-gray-500">
                                    <span class="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <input 
                                    class="w-10 bg-transparent border-none text-center font-semibold text-sm p-0 focus:ring-0" 
                                    type="text" 
                                    value="${item.quantity}" 
                                    readonly
                                />
                                <button onclick="updateCartItem(${item.id}, ${item.quantity + 1}, null)" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-[#1e2125] transition-colors text-gray-500">
                                    <span class="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>

                            <div class="text-right">
                                <div class="text-xl font-bold text-sale-red">
                                    ${formatCurrency(item.subTotal)}
                                </div>
                                ${basePriceHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
}

// RENDER TỔNG TIỀN
function renderCartSummary(cart) {
  const totalItemsEl = document.getElementById("summary-total-items");
  const subTotalEl = document.getElementById("summary-subtotal");
  const finalTotalEl = document.getElementById("summary-final-total");
  const headerCountEl = document.getElementById("header-cart-count");

  if (totalItemsEl) totalItemsEl.innerText = `${cart.totalItems || 0} sản phẩm`;
  if (headerCountEl)
    headerCountEl.innerText = `(${cart.totalItems || 0} sản phẩm)`;

  const total = cart.totalAmount || 0;

  if (subTotalEl) subTotalEl.innerText = formatCurrency(total);
  if (finalTotalEl) finalTotalEl.innerText = formatCurrency(total);
}

// API: CẬP NHẬT ITEM
async function updateCartItem(itemId, newQuantity, isSelected) {
  const token = AuthUtils.getToken();

  let url = `${AppConfig.CART_API_URL}/item/${itemId}?`;
  if (newQuantity !== null) url += `quantity=${newQuantity}&`;
  if (isSelected !== null) url += `isSelected=${isSelected}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      currentCartData = await response.json();
      renderCartItems(currentCartData.items);
      renderCartSummary(currentCartData);
    }
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
  }
}

// API: XÓA ITEM
async function removeCartItem(itemId) {
  if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

  const token = AuthUtils.getToken();
  try {
    const response = await fetch(`${AppConfig.CART_API_URL}/item/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      currentCartData = await response.json();
      renderCartItems(currentCartData.items);
      renderCartSummary(currentCartData);

      if (typeof HeaderLogic !== "undefined") {
        HeaderLogic.updateCartBadge();
      }
    }
  } catch (error) {
    console.error("Lỗi xóa:", error);
  }
}
async function toggleSelectAll(isSelected) {
  const token = AuthUtils.getToken();

  try {
    const response = await fetch(
      `${AppConfig.CART_API_URL}/select-all?isSelected=${isSelected}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      currentCartData = await response.json();
      renderCartItems(currentCartData.items);
      renderCartSummary(currentCartData);
    }
  } catch (error) {
    console.error("Lỗi cập nhật chọn tất cả:", error);
  }
}
// XỬ LÝ NÚT "TIẾP TỤC MUA SẮM"
function continueShopping(event) {
  // Ngăn chặn hành vi mặc định
  if (event) event.preventDefault();

  // Kiểm tra xem có trang trước đó để quay lại không
  if (window.history.length > 1 && document.referrer !== "") {
    window.history.back();
  } else {
    window.location.href = "home.html";
  }
}
function fillCustomerInfo() {
  if (AuthUtils.isLoggedIn()) {
    const fullName = AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME);
    const email = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL);

    // --- Lấy số điện thoại ---
    const phone = AuthUtils.getUserInfo(AppConfig.KEYS.PHONE);

    const nameInput = document.getElementById("customer-fullname");
    const emailInput = document.getElementById("customer-email");
    const phoneInput = document.getElementById("customer-phone");

    if (nameInput && fullName && fullName !== "null") {
      nameInput.value = fullName;
    }
    if (emailInput && email && email !== "null") {
      emailInput.value = email;
    }

    // --- Gán SĐT vào ô input ---
    if (phoneInput && phone && phone !== "null") {
      phoneInput.value = phone;
    }
  }
}
// XỬ LÝ ĐẶT HÀNG
async function placeOrder() {
  if (!AuthUtils.isLoggedIn()) {
    alert("Vui lòng đăng nhập để đặt hàng!");
    window.location.href = "login.html";
    return;
  }

  // Kiểm tra giỏ hàng và lọc ra các item ĐÃ ĐƯỢC CHỌN
  if (
    !currentCartData ||
    !currentCartData.items ||
    currentCartData.items.length === 0
  ) {
    alert("Giỏ hàng của bạn đang trống!");
    return;
  }

  const selectedItems = currentCartData.items.filter((item) => item.isSelected);
  if (selectedItems.length === 0) {
    alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
    return;
  }

  // Lấy thông tin form giao hàng
  const receiverName = document
    .getElementById("customer-fullname")
    ?.value.trim();
  const receiverPhone = document.getElementById("customer-phone")?.value.trim();
  const shippingAddress = document
    .getElementById("customer-address")
    ?.value.trim();

  if (!receiverName || !receiverPhone || !shippingAddress) {
    alert("Vui lòng điền đầy đủ thông tin giao hàng (Họ tên, SĐT, Địa chỉ)!");
    return;
  }

  // Lấy phương thức thanh toán
  const paymentRadio = document.querySelector('input[name="payment"]:checked');
  const paymentMethod = paymentRadio ? paymentRadio.value : "COD";

  // Build dữ liệu sản phẩm
  const orderItems = selectedItems.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productThumbnail: item.productThumbnail,
    quantity: item.quantity,
    unitPrice: item.price, // Giá bán thực tế
  }));

  const orderPayload = {
    receiverName,
    receiverPhone,
    shippingAddress,
    paymentMethod,
    voucherCode: "", // Tương lai có thể map ID ô input voucher vào đây
    shippingFee: 0,
    discountAmount: 0,
    items: orderItems,
  };

  // Giao diện Loading
  const btn = document.getElementById("btn-place-order");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...`;

  // Gọi API OrderService
  try {
    const token = AuthUtils.getToken();
    const response = await fetch(`${AppConfig.ORDER_API_URL}/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (response.ok) {
      const orderData = await response.json();

      // In ra console để kiểm chứng dữ liệu trả về
      console.log("Dữ liệu đơn hàng vừa tạo:", orderData);

      // Xóa các sản phẩm đã mua khỏi giỏ hàng
      const deleteRequests = selectedItems.map((item) =>
        fetch(`${AppConfig.CART_API_URL}/item/${item.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      await Promise.all(deleteRequests);

      if (typeof HeaderLogic !== "undefined") {
        HeaderLogic.updateCartBadge();
      }

      // ==========================================
      // LẤY CHÍNH XÁC MÃ ĐƠN HÀNG
      // ==========================================
      let finalOrderCode = orderData.orderCode || orderData.order_code;

      // Xử lý thêm trường hợp Backend bọc dữ liệu trong biến 'data'
      if (!finalOrderCode && orderData.data) {
        finalOrderCode = orderData.data.orderCode || orderData.data.order_code;
      }

      // Nếu vẫn không tìm thấy, báo lỗi để chặn lại
      if (!finalOrderCode) {
        alert(
          "Lỗi Frontend: Không thể tìm thấy 'orderCode' trong dữ liệu trả về! Vui lòng nhấn F12 mở tab Console để xem chi tiết.",
        );
        return; // Dừng lại, không chuyển trang
      }

      // Chuyển hướng với đúng mã VMAS
      window.location.href = `payment_success.html?orderCode=${finalOrderCode}`;
    } else {
      const errorText = await response.text();
      alert("Lỗi đặt hàng: " + errorText);
    }
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}
