document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get("orderCode");

  // --- Chặn thêm trường hợp chữ "undefined" và "null" ---
  if (!orderCode || orderCode === "undefined" || orderCode === "null") {
    alert("Không tìm thấy mã đơn hàng hợp lệ!");
    window.location.href = "home.html";
    return;
  }

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  try {
    // Gọi API lấy chi tiết đơn hàng
    const token = AuthUtils.getToken();
    const response = await fetch(`${AppConfig.ORDER_API_URL}/${orderCode}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Không thể tải thông tin đơn hàng!");
    }

    const order = await response.json();

    // ĐỔ DỮ LIỆU LÊN GIAO DIỆN
    // Lấy mã đơn hàng ưu tiên từ orderCode, nếu không có thì lấy order_code, cuối cùng mới lấy id
    const finalDisplayCode = order.orderCode || order.order_code || order.id;

    // Mã đơn & Thông tin giao hàng
    document.getElementById("order-code-display").innerText =
      `#${finalDisplayCode}`;
    document.getElementById("receiver-name").innerText = order.receiverName;
    document.getElementById("receiver-phone").innerText = order.receiverPhone;
    document.getElementById("shipping-address").innerText =
      order.shippingAddress;

    // Cấu hình hiển thị theo Phương thức thanh toán
    const methodConfig = {
      COD: {
        name: "Thanh toán khi nhận hàng (COD)",
        desc: "Thanh toán bằng tiền mặt",
        icon: "paid",
        colorClass: "text-green-600",
        bgClass: "bg-green-100",
      },
      MOMO: {
        name: "Ví điện tử MoMo",
        desc: "Đã thanh toán trực tuyến",
        icon: "account_balance_wallet",
        colorClass: "text-pink-600",
        bgClass: "bg-pink-100",
      },
      ZALOPAY: {
        name: "Ví điện tử ZaloPay",
        desc: "Đã thanh toán trực tuyến",
        icon: "qr_code_scanner",
        colorClass: "text-blue-600",
        bgClass: "bg-blue-100",
      },
    };
    const pm = methodConfig[order.paymentMethod] || methodConfig["COD"];

    document.getElementById("payment-method-name").innerText = pm.name;
    document.getElementById("payment-method-desc").innerText = pm.desc;
    document.getElementById("payment-method-icon").innerText = pm.icon;
    document.getElementById("payment-method-icon").className =
      `material-symbols-outlined ${pm.colorClass}`;
    document.getElementById("payment-method-bg").className =
      `w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${pm.bgClass}`;

    // Cấu hình hiển thị theo Trạng thái thanh toán
    const statusConfig = {
      PENDING: {
        text: "Chờ thanh toán",
        css: "bg-yellow-100 text-yellow-700 border-yellow-200",
      },
      PAID: {
        text: "Đã thanh toán",
        css: "bg-green-100 text-green-700 border-green-200",
      },
      FAILED: {
        text: "Thanh toán thất bại",
        css: "bg-red-100 text-red-700 border-red-200",
      },
    };
    const ps = statusConfig[order.paymentStatus] || statusConfig["PENDING"];
    const statusBadge = document.getElementById("payment-status-badge");
    statusBadge.innerText = ps.text;
    statusBadge.className = `px-2.5 py-1 rounded text-xs font-semibold border ${ps.css}`;

    // Render danh sách sản phẩm
    const itemsContainer = document.getElementById("order-items-container");
    itemsContainer.innerHTML = order.items
      .map(
        (item) => `
            <div class="flex gap-4">
                <div class="w-16 h-16 bg-[#f8fcfc] dark:bg-[#25282c] rounded-lg p-1 shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    ${
                      item.productThumbnail
                        ? `<img src="${item.productThumbnail}" alt="${item.productName}" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" onerror="this.src='https://placehold.co/100?text=No+Img'" />`
                        : `<span class="material-symbols-outlined text-gray-400 text-3xl">inventory_2</span>`
                    }
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">${item.productName}</h4>
                    <p class="text-xs text-gray-500 mt-1">SL: ${item.quantity} x ${formatCurrency(item.unitPrice)}</p>
                </div>
                <div class="text-sm font-bold text-gray-900 dark:text-white">${formatCurrency(item.totalPrice)}</div>
            </div>
        `,
      )
      .join("");

    // Render Tóm tắt tài chính
    document.getElementById("summary-subtotal").innerText = formatCurrency(
      order.subTotal,
    );
    document.getElementById("summary-shipping").innerText =
      order.shippingFee === 0 ? "Miễn phí" : formatCurrency(order.shippingFee);
    document.getElementById("summary-total").innerText = formatCurrency(
      order.totalAmount,
    );
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải thông tin đơn hàng!");
  }
});
