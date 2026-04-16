document.addEventListener("DOMContentLoaded", () => {
  AuthUtils.requireAdmin();
  loadVouchers();
});

function toggleMaxDiscountField() {
  const type = document.getElementById("modal-voucher-type").value;
  const maxDiscountInput = document.getElementById(
    "modal-voucher-max-discount",
  );
  if (type === "FIXED_AMOUNT") {
    maxDiscountInput.value = "";
    maxDiscountInput.disabled = true;
    maxDiscountInput.classList.add("bg-gray-100", "cursor-not-allowed");
  } else {
    maxDiscountInput.disabled = false;
    maxDiscountInput.classList.remove("bg-gray-100", "cursor-not-allowed");
  }
}

async function loadVouchers() {
  try {
    const res = await fetch(`${AppConfig.ORDER_API_URL}/vouchers/admin/all`, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });
    if (!res.ok) throw new Error("Lỗi tải dữ liệu");

    const vouchers = await res.json();
    const tbody = document.getElementById("voucher-table-body");

    if (vouchers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500">Chưa có mã giảm giá nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = vouchers
      .map((v) => {
        const formatValue =
          v.discountType === "PERCENTAGE"
            ? `${v.discountValue}%`
            : UIUtils.formatCurrency(v.discountValue);
        const statusClass = v.active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700";
        const statusText = v.active ? "Đang hoạt động" : "Đã khóa";
        const endDateText = v.endDate
          ? new Date(v.endDate).toLocaleString("vi-VN")
          : "Không giới hạn";
        const usageText = `${v.usedCount || 0} / ${v.usageLimit ? v.usageLimit : '∞'}`;

        return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="inline-block bg-primary/10 text-primary font-bold px-3 py-1 rounded-md uppercase tracking-wider">${v.voucherCode}</span>
                    </td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-700">${v.discountType === "PERCENTAGE" ? "Phần trăm" : "Cố định"}</td>
                    <td class="px-6 py-4 text-sm font-bold text-[#d70018]">${formatValue}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${UIUtils.formatCurrency(v.minOrderAmount || 0)}</td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-600">${usageText}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${endDateText}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${statusText}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick='editVoucher(${JSON.stringify(v)})' class="size-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Chỉnh sửa">
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onclick="deleteVoucher(${v.id})" class="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Xóa">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function openVoucherModal() {
  document.getElementById("modal-voucher-title").innerText =
    "Thêm mã giảm giá mới";
  document.getElementById("voucher-form").reset();
  document.getElementById("modal-voucher-id").value = "";

  document.getElementById("modal-voucher-active").value = "true";
  toggleMaxDiscountField();

  const now = getCurrentLocalISOString();
  const startInput = document.getElementById("modal-voucher-start");
  const endInput = document.getElementById("modal-voucher-end");

  // Không cho chọn ngày trong quá khứ
  startInput.min = now;
  endInput.min = now;

  const modal = document.getElementById("voucher-modal");
  modal.classList.remove("hidden");

  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

function closeVoucherModal() {
  const modal = document.getElementById("voucher-modal");
  modal.classList.add("opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

function editVoucher(v) {
  document.getElementById("modal-voucher-title").innerText =
    "Chỉnh sửa mã giảm giá";
  document.getElementById("modal-voucher-id").value = v.id;
  document.getElementById("modal-voucher-code").value = v.voucherCode;
  document.getElementById("modal-voucher-type").value = v.discountType;
  document.getElementById("modal-voucher-value").value = v.discountValue;
  document.getElementById("modal-voucher-min-order").value =
    v.minOrderAmount || "";
  document.getElementById("modal-voucher-max-discount").value =
    v.maxDiscountAmount || "";
  document.getElementById("modal-voucher-usage-limit").value =
    v.usageLimit || "";
  document.getElementById("modal-voucher-active").value = v.active.toString();

  if (v.startDate)
    document.getElementById("modal-voucher-start").value = v.startDate.slice(
      0,
      16,
    );
  if (v.endDate)
    document.getElementById("modal-voucher-end").value = v.endDate.slice(0, 16);

  toggleMaxDiscountField();

  document.getElementById("modal-voucher-start").removeAttribute("min");
  // Cập nhật lại giới hạn cho ngày kết thúc
  handleStartDateChange();

  const modal = document.getElementById("voucher-modal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

async function saveVoucher() {
  const code = document
    .getElementById("modal-voucher-code")
    .value.trim()
    .toUpperCase();
  const value = document.getElementById("modal-voucher-value").value;

  if (!code || !value) {
    alert("Vui lòng điền mã Voucher và giá trị giảm!");
    return;
  }

  const btn = document.getElementById("btn-save-voucher");
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Đang lưu...`;
  btn.disabled = true;

  const data = {
    voucherCode: code,
    discountType: document.getElementById("modal-voucher-type").value,
    discountValue: value,
    minOrderAmount:
      document.getElementById("modal-voucher-min-order").value || 0,
    maxDiscountAmount:
      document.getElementById("modal-voucher-max-discount").value || null,
    usageLimit:
      document.getElementById("modal-voucher-usage-limit").value || null,
    startDate: document.getElementById("modal-voucher-start").value || null,
    endDate: document.getElementById("modal-voucher-end").value || null,
    isActive: document.getElementById("modal-voucher-active").value === "true",
  };

  const id = document.getElementById("modal-voucher-id").value;
  const url = id ? `/update/${id}` : `/add`;
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(`${AppConfig.ORDER_API_URL}/vouchers/admin${url}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      alert("Lưu mã giảm giá thành công!");
      closeVoucherModal();
      loadVouchers();
    } else {
      const err = await res.text();
      alert("Lỗi: " + err);
    }
  } catch (e) {
    console.error(e);
    alert("Có lỗi xảy ra khi kết nối máy chủ");
  } finally {
    btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">save</span> Lưu voucher`;
    btn.disabled = false;
  }
}

async function deleteVoucher(id) {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa mã giảm giá này không? Hành động này không thể hoàn tác.",
    )
  )
    return;

  try {
    const res = await fetch(
      `${AppConfig.ORDER_API_URL}/vouchers/admin/delete/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (res.ok) {
      alert("Xóa thành công!");
      loadVouchers();
    } else {
      alert("Không thể xóa mã này!");
    }
  } catch (e) {
    console.error(e);
  }
}
// Lấy thời gian hiện tại
function getCurrentLocalISOString() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

// Xử lý khi người dùng thay đổi "Ngày bắt đầu"
function handleStartDateChange() {
  const startInput = document.getElementById("modal-voucher-start");
  const endInput = document.getElementById("modal-voucher-end");

  if (startInput.value) {
    // Ngày kết thúc không được nhỏ hơn Ngày bắt đầu
    endInput.min = startInput.value;

    // Nếu người dùng đã lỡ chọn Ngày kết thúc nhỏ hơn Ngày bắt đầu từ trước, thì reset lại
    if (endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
  } else {
    // Nếu xóa trắng Ngày bắt đầu, Ngày kết thúc chỉ bị giới hạn bởi thời điểm hiện tại
    endInput.min = getCurrentLocalISOString();
  }
}
