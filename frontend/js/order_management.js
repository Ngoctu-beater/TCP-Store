let currentPage = 0;
const pageSize = 10;
let currentSearch = "";
let currentStatus = "";
let baseUrl = AppConfig.ORDER_API_URL;
if (!baseUrl) {
  // Tự động tìm cổng 8084 (tùy server của bạn) và giữ lại /api
  const apiBase = AppConfig.BASE_URL.replace("8081", "8084");
  baseUrl = `${apiBase}/orders`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadOrders();
  loadOrderStatistics();

  // Lắng nghe ô tìm kiếm
  const searchInput = document.getElementById("search-order");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0;
        loadOrders();
      }
    });
  }

  // Lắng nghe Dropdown lọc trạng thái
  const statusFilter = document.getElementById("filter-status");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatus = e.target.value;
      currentPage = 0;
      loadOrders();
    });
  }
});

// GỌI API LẤY DANH SÁCH
async function loadOrders() {
  const tbody = document.getElementById("order-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải dữ liệu...</td></tr>`;

  try {
    const url = `${baseUrl}/orders/admin?keyword=${encodeURIComponent(currentSearch)}&status=${currentStatus}&page=${currentPage}&size=${pageSize}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi tải danh sách");
    const data = await response.json(); // Nhận về Page<Order>

    renderTable(data.content);
    renderPagination(data);

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}
async function loadOrderStatistics() {
    try {
        const url = `${AppConfig.ORDER_API_URL}/orders/admin/statistics`;
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
        });

        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById("stat-total-orders").innerText = (stats.total || 0).toLocaleString('vi-VN');
            document.getElementById("stat-pending-orders").innerText = (stats.pending || 0).toLocaleString('vi-VN');
            document.getElementById("stat-shipping-orders").innerText = (stats.shipping || 0).toLocaleString('vi-VN');
            document.getElementById("stat-completed-orders").innerText = (stats.completed || 0).toLocaleString('vi-VN');
        }
    } catch (error) {
        console.error("Lỗi tải thống kê đơn hàng:", error);
    }
}

// RENDER BẢNG
function renderTable(orders) {
  const tbody = document.getElementById("order-table-body");

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Không tìm thấy đơn hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map((o) => {
      // Format Ngày tháng
      const dateObj = new Date(o.createdAt);
      const dateStr = dateObj.toLocaleDateString("vi-VN");
      const timeStr = dateObj.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Format Trạng thái
      let statusConfig = {
        class: "bg-gray-100 text-gray-700 border-gray-200",
        dot: "bg-gray-500",
        text: o.orderStatus,
      };
      switch (o.orderStatus) {
        case "PENDING":
          statusConfig = {
            class: "bg-orange-100 text-orange-700 border-orange-200",
            dot: "bg-orange-600",
            text: "Chờ xác nhận",
          };
          break;
        case "CONFIRMED":
          statusConfig = {
            class: "bg-blue-100 text-blue-700 border-blue-200",
            dot: "bg-blue-600",
            text: "Đang xử lý",
          };
          break;
        case "SHIPPING":
          statusConfig = {
            class: "bg-purple-100 text-purple-700 border-purple-200",
            dot: "bg-purple-600",
            text: "Đang giao hàng",
          };
          break;
        case "DELIVERED":
          statusConfig = {
            class: "bg-green-100 text-green-700 border-green-200",
            dot: "bg-green-600",
            text: "Hoàn thành",
          };
          break;
        case "CANCELLED":
          statusConfig = {
            class: "bg-red-100 text-red-700 border-red-200",
            dot: "bg-red-600",
            text: "Đã hủy",
          };
          break;
      }

      const initials = UIUtils.getInitials(o.receiverName || "KH");

      return `
        <tr class="hover:bg-[#f9fafb] transition-colors group">
            <td class="py-4 px-6">
                <a onclick="openOrderModal('${o.orderCode}', 'view')" class="text-primary font-bold hover:underline cursor-pointer">#${o.orderCode}</a>
            </td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center">
                ${dateStr} <span class="text-[#637588] text-xs block">${timeStr}</span>
            </td>
            <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                    <div class="size-8 rounded-full bg-blue-100 flex items-center justify-center text-primary text-xs font-bold">
                        ${initials}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-[#111417]">${o.receiverName}</p>
                        <p class="text-xs text-[#637588]">${o.receiverPhone}</p>
                    </div>
                </div>
            </td>
            <td class="py-4 px-6 text-sm font-bold text-[#111417] text-center">
                ${UIUtils.formatCurrency(o.totalAmount)}
            </td>
            <td class="py-4 px-6 text-sm text-[#111417]">
                <span class="flex items-center gap-1.5 justify-center">
                    <span class="material-symbols-outlined text-[16px] text-[#637588]">
                        ${o.paymentMethod === "COD" ? "payments" : "account_balance"}
                    </span>
                    ${o.paymentMethod}
                </span>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="inline-flex items-center text-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.class}">
                    <span class="size-1.5 rounded-full ${statusConfig.dot} mr-1.5"></span>
                    ${statusConfig.text}
                </span>
            </td>
            <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="openOrderModal('${o.orderCode}', 'view')" class="text-[#637588] hover:text-primary p-1.5 rounded hover:bg-blue-50 transition-colors" title="Xem chi tiết">
                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                    <button onclick="openOrderModal('${o.orderCode}', 'edit')" class="text-[#637588] hover:text-green-600 p-1.5 rounded hover:bg-green-50 transition-colors" title="Cập nhật trạng thái">
                        <span class="material-symbols-outlined text-[20px]">edit_note</span>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

// PHÂN TRANG
function renderPagination(pageData) {
  const info = document.getElementById("pagination-info");
  if (info) {
    const start = pageData.pageable.offset + 1;
    const end = Math.min(start + pageData.size - 1, pageData.totalElements);
    if (pageData.totalElements === 0) {
      info.innerHTML = `Không có dữ liệu`;
    } else {
      info.innerHTML = `Hiển thị <span class="font-bold text-[#111417]">${start}-${end}</span> trong <span class="font-bold text-[#111417]">${pageData.totalElements}</span> đơn hàng`;
    }
  }

  // Cập nhật trạng thái Tắt/Mở của 2 mũi tên
  document.getElementById("btn-prev-page").disabled = pageData.first;
  document.getElementById("btn-next-page").disabled = pageData.last;

  // Cập nhật con số hiển thị
  const pageNumEl = document.getElementById("current-page-number");
  if (pageNumEl) {
    pageNumEl.innerText = pageData.number + 1;
  }
}

async function openOrderModal(orderCode, mode = "view") {
  const modal = document.getElementById("order-modal");
  modal.classList.remove("hidden");

  // Kiểm tra xem đang ở chế độ nào
  const isEdit = mode === "edit";

  // Đổi Tiêu đề Modal
  document.getElementById("modal-order-title").innerText = isEdit
    ? `Cập nhật đơn hàng #${orderCode}`
    : `Chi tiết đơn hàng #${orderCode}`;
  document.getElementById("modal-order-code").value = orderCode;

  // KHÓA/MỞ các trường Select và Nút Lưu
  document.getElementById("modal-payment-status").disabled = !isEdit;
  document.getElementById("modal-order-status").disabled = !isEdit;

  const saveBtn = document.getElementById("btn-save-status");
  if (saveBtn) {
    // Nút lưu hiển thị flex nếu là edit, ẩn đi nếu là view
    saveBtn.style.display = isEdit ? "flex" : "none";
  }

  const tbody = document.getElementById("modal-order-items");
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span></td></tr>`;

  try {
    const url = `${AppConfig.ORDER_API_URL}/orders/admin/${orderCode}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });
    if (!response.ok) throw new Error("Không thể tải chi tiết");
    const order = await response.json();

    // Đổ thông tin Giao hàng & Thanh toán
    document.getElementById("modal-customer-name").innerText =
      order.receiverName;
    document.getElementById("modal-customer-phone").innerText =
      order.receiverPhone;
    document.getElementById("modal-customer-address").innerText =
      order.shippingAddress;
    document.getElementById("modal-payment-method").innerText =
      order.paymentMethod;

    // Trạng thái hiện tại
    document.getElementById("modal-payment-status").value = order.paymentStatus;
    document.getElementById("modal-order-status").value = order.orderStatus;

    // Cập nhật giá trị cho 2 ô Select trạng thái
    document.getElementById("modal-payment-status").value = order.paymentStatus;
    document.getElementById("modal-order-status").value = order.orderStatus;

    // ==========================================
    // LOGIC KHÓA CÁC TRẠNG THÁI NGƯỢC
    // ==========================================
    if (isEdit) {
      // Xử lý Select Trạng thái đơn hàng
      const orderStatusSelect = document.getElementById("modal-order-status");
      const orderStatuses = [
        "PENDING",
        "CONFIRMED",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ];
      const currentOrderIdx = orderStatuses.indexOf(order.orderStatus);

      Array.from(orderStatusSelect.options).forEach((opt) => {
        if (
          order.orderStatus === "DELIVERED" ||
          order.orderStatus === "CANCELLED"
        ) {
          // Nếu đã Hoàn thành/Hủy: Khóa TẤT CẢ các tùy chọn khác
          opt.disabled = opt.value !== order.orderStatus;
        } else {
          if (opt.value === "CANCELLED") {
            opt.disabled = false; // Luôn mở nút Hủy nếu đơn chưa chốt
          } else {
            // Khóa các trạng thái nằm trước trạng thái hiện tại
            opt.disabled = orderStatuses.indexOf(opt.value) < currentOrderIdx;
          }
        }
      });

      // Xử lý Select Trạng thái thanh toán
      const paymentStatusSelect = document.getElementById(
        "modal-payment-status",
      );
      Array.from(paymentStatusSelect.options).forEach((opt) => {
        if (order.paymentStatus === "PAID") {
          // Nếu đã thanh toán: Khóa hết
          opt.disabled = opt.value !== "PAID";
        } else if (order.paymentStatus === "FAILED") {
          // Nếu thất bại: Khóa tùy chọn quay lại Pending
          opt.disabled = opt.value === "PENDING";
        } else {
          opt.disabled = false;
        }
      });
    }

    // Đổ danh sách sản phẩm
    tbody.innerHTML = order.items
      .map(
        (item) => `
            <tr class="hover:bg-[#f9fafb]">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded border border-[#e5e7eb] bg-cover bg-center flex-shrink-0" style="background-image: url('${item.productThumbnail || "https://via.placeholder.com/150"}')"></div>
                        <span class="font-bold text-[#111417] text-sm line-clamp-2">${item.productName}</span>
                    </div>
                </td>
                <td class="py-3 px-4 text-center font-bold text-[#111417]">${item.quantity}</td>
                <td class="py-3 px-4 text-right text-[#637588]">${UIUtils.formatCurrency(item.unitPrice)}</td>
                <td class="py-3 px-4 text-right font-bold text-primary">${UIUtils.formatCurrency(item.totalPrice)}</td>
            </tr>
        `,
      )
      .join("");

    // Tiền nong
    document.getElementById("modal-subtotal").innerText =
      UIUtils.formatCurrency(order.subTotal);
    document.getElementById("modal-shipping-fee").innerText =
      UIUtils.formatCurrency(order.shippingFee);
    document.getElementById("modal-discount").innerText =
      "-" + UIUtils.formatCurrency(order.discountAmount);
    document.getElementById("modal-total").innerText = UIUtils.formatCurrency(
      order.totalAmount,
    );
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-4">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
  }
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
}

async function saveOrderStatus() {
  const orderCode = document.getElementById("modal-order-code").value;
  const newStatus = document.getElementById("modal-order-status").value;
  const btn = document.getElementById("btn-save-status");

  if (!confirm("Xác nhận cập nhật trạng thái đơn hàng này?")) return;

  UIUtils.setLoading(btn, true, "Đang xử lý...");
  try {
    const url = `${AppConfig.ORDER_API_URL}/orders/${orderCode}/status?status=${newStatus}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      alert("Đã cập nhật trạng thái đơn hàng thành công!");
      closeOrderModal();
      loadOrders();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (err) {
    alert("Lỗi kết nối máy chủ");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu cập nhật");
  }
}
function changePage(dir) {
  currentPage += dir;
  loadOrders();
}
