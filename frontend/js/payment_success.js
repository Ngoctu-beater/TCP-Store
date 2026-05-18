document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get("orderCode");

  if (!orderCode) {
    window.location.href = "home.html";
    return;
  }

  // Hiển thị mã đơn hàng
  document.getElementById("order-code-display").innerText = orderCode;
  
  // 1. Tải chi tiết đơn hàng để hiển thị
  fetchOrderDetails(orderCode);

  // 2. THỰC HIỆN XÓA GIỎ HÀNG (Vì đã đặt hàng/thanh toán thành công)
  await clearCartOnSuccess();
});

async function fetchOrderDetails(orderCode) {
  const token = AuthUtils.getToken();
  try {
    const response = await fetch(
      `${AppConfig.ORDER_API_URL}/orders/${orderCode}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      const order = await response.json();
      document.getElementById("receiver-name").innerText = order.receiverName;
      document.getElementById("receiver-phone").innerText = order.receiverPhone;
      document.getElementById("shipping-address").innerText = order.shippingAddress;

      // Render danh sách sản phẩm đã mua
      const container = document.getElementById("order-items-container");
      container.innerHTML = order.items
        .map(
          (item) => `
                <div class="flex justify-between text-sm py-1">
                    <span><img src="${item.productThumbnail}" alt="${item.productName}" class="w-16 h-16 object-cover"></span>
                    <span class="ml-5">${item.productName} x${item.quantity}</span>
                    <span class="font-bold">${new Intl.NumberFormat("vi-VN").format(item.unitPrice * item.quantity)}đ</span>
                </div>
            `,
        )
        .join("");

      document.getElementById("summary-subtotal").innerText =
        new Intl.NumberFormat("vi-VN").format(order.subTotal) + "đ";
      document.getElementById("summary-total").innerText =
        new Intl.NumberFormat("vi-VN").format(order.totalAmount) + "đ";
    }
  } catch (e) {
    console.error("Lỗi lấy chi tiết đơn hàng:", e);
  }
}

/**
 * Hàm gọi API xóa sạch giỏ hàng của người dùng
 */
async function clearCartOnSuccess() {
  const token = AuthUtils.getToken();
  if (!token) return;

  try {
    // Gọi đến API xóa giỏ hàng thông qua Gateway
    // Đường dẫn này phải khớp với cấu hình trong application.yml của Gateway
    const response = await fetch(`${AppConfig.CART_API_URL}`, {
      method: "DELETE",
      headers: { 
        "Authorization": `Bearer ${token}` 
      },
    });

    if (response.ok) {
      console.log("Giỏ hàng đã được dọn dẹp sau khi đặt hàng thành công.");
      // Cập nhật lại badge giỏ hàng trên Header nếu có sử dụng HeaderLogic
      if (typeof HeaderLogic !== "undefined") {
        HeaderLogic.updateCartBadge();
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa giỏ hàng:", error);
  }
}