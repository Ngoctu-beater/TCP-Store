let currentPage = 0;
const pageSize = 10;
let currentSearch = "";

document.addEventListener("DOMContentLoaded", () => {
  loadCustomerStats();
  loadCustomers();

  // Lắng nghe sự kiện tìm kiếm
  const searchInput = document.getElementById("search-customer");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0; // Reset về trang đầu
        loadCustomers();
      }
    });
  }
});

async function loadCustomers() {
  const tbody = document.getElementById("customer-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải dữ liệu...</td></tr>`;

  try {
    const url = `${AppConfig.BASE_URL}/users/admin/customers?keyword=${encodeURIComponent(currentSearch)}&page=${currentPage}&size=${pageSize}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi tải danh sách");
    const data = await response.json(); // Data này là dạng Page của Spring Boot

    renderTable(data.content);
    renderPagination(data);

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi tải dữ liệu khách hàng!</td></tr>`;
  }
}

function renderTable(users) {
  const tbody = document.getElementById("customer-table-body");

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Không tìm thấy khách hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const initials = UIUtils.getInitials(u.fullName || "KH");

      // Giao diện trạng thái
      const statusHtml = u.isActive
        ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">Hoạt động</span>`
        : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Bị khóa</span>`;

      return `
        <tr class="hover:bg-[#f9fafb] transition-colors group">
            <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                    <div class="size-10 rounded-full ${u.avatar ? "p-0" : "bg-primary/10 text-primary"} flex items-center justify-center text-sm font-bold overflow-hidden border border-[#e5e7eb]">
                        ${
                          u.avatar
                            ? `<img src="${u.avatar}" class="w-full h-full object-cover"/>`
                            : initials
                        }
                    </div>
                    <div>
                        <p class="text-sm font-bold text-[#111417]">${u.fullName || "Chưa cập nhật"}</p>
                        
                    </div>
                </div>
            </td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center">${u.email}</td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center">${u.phoneNumber || "---"}</td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center font-medium">0</td> <td class="py-4 px-6 text-sm font-bold text-[#111417] text-center">0 ₫</td> <td class="py-4 px-6 text-center">${statusHtml}</td>
            <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-center gap-2">
                    
                    
                    <button onclick="openCustomerModal(${u.userId}, 'view')" class="text-[#637588] hover:bg-gray-100 p-1.5 rounded-lg transition-colors" title="Xem chi tiết">
                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                    </button>

                    <button onclick="toggleCustomerStatus(${u.userId}, ${u.isActive})" 
                            class="text-[${u.isActive ? "#637588" : "#ef4444"}] hover:bg-gray-100 p-1.5 rounded-lg transition-colors" 
                            title="${u.isActive ? "Khóa tài khoản" : "Mở khóa"}">
                        <span class="material-symbols-outlined text-[20px]">${u.isActive ? "lock" : "lock_open"}</span>
                    </button>
                </div>
            </td>
        </tr>
        `;
    })
    .join("");
}

async function toggleCustomerStatus(userId, currentStatus) {
  const action = currentStatus ? "KHÓA" : "MỞ KHÓA";
  if (!confirm(`Bạn có chắc chắn muốn ${action} tài khoản này không?`)) return;

  try {
    const response = await fetch(
      `${AppConfig.BASE_URL}/users/admin/${userId}/toggle-status`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (response.ok) {
      alert(await response.text());
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    alert("Lỗi hệ thống!");
  }
}

// Hàm phân trang cơ bản
function renderPagination(pageData) {
  const paginationInfo = document.getElementById("pagination-info");
  if (paginationInfo) {
    const start = pageData.pageable.offset + 1;
    const end = Math.min(start + pageData.size - 1, pageData.totalElements);
    paginationInfo.innerText = `Hiển thị ${start}-${end} trong số ${pageData.totalElements} khách hàng`;
  }
  // Gắn logic disable nút Trước/Sau dựa vào pageData.first và pageData.last
  document.getElementById("btn-prev-page").disabled = pageData.first;
  document.getElementById("btn-next-page").disabled = pageData.last;
}

function changePage(dir) {
  currentPage += dir;
  loadCustomers();
}
async function loadCustomerStats() {
  try {
    // để keyword rỗng để luôn lấy tổng số khách hàng thực tế
    const url = `${AppConfig.BASE_URL}/users/admin/customers?keyword=&page=0&size=1`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      const data = await response.json();
      // Cập nhật lên UI
      const totalStatEl = document.getElementById("total-customers-stat");
      if (totalStatEl) totalStatEl.innerText = data.totalElements;
    }
  } catch (error) {
    console.error("Lỗi tải thống kê:", error);
  }
}

// ==========================================
// LOGIC XỬ LÝ XEM/SỬA CHI TIẾT KHÁCH HÀNG
// ==========================================

let modalAvatarFile = null;
let currentCustomerAvatar = "";

async function openCustomerModal(id, mode) {
  const modal = document.getElementById("customer-modal");
  const title = document.getElementById("modal-title");
  const saveBtn = document.getElementById("btn-save-customer");
  const changeAvatarBtn = document.getElementById("btn-change-avatar");
  const passGroup = document.getElementById("modal-password-group");

  modalAvatarFile = null;
  document.getElementById("modal-avatar-input").value = "";

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  // Cập nhật Tiêu đề & Nút bấm
  if (isAdd) title.innerText = "Thêm khách hàng mới";
  else if (isEdit) title.innerText = "Sửa thông tin khách hàng";
  else title.innerText = "Chi tiết khách hàng";

  saveBtn.style.display = isEdit || isAdd ? "block" : "none";
  changeAvatarBtn.style.display = isEdit || isAdd ? "block" : "none";

  // Ẩn hiện ô mật khẩu
  if (passGroup) passGroup.classList.toggle("hidden", !isAdd);

  // Mở khóa các ô input
  const inputs = [
    "modal-fullname",
    "modal-email",
    "modal-phone",
    "modal-dob",
    "modal-password",
  ];
  inputs.forEach(
    (inputId) =>
      (document.getElementById(inputId).disabled = !(isEdit || isAdd)),
  );
  document
    .getElementsByName("modal-gender")
    .forEach((radio) => (radio.disabled = !(isEdit || isAdd)));

  // NẾU LÀ THÊM MỚI -> Xóa trắng form và mở Modal
  if (isAdd) {
    document.getElementById("modal-user-id").value = "";
    inputs.forEach((inputId) => (document.getElementById(inputId).value = ""));
    document
      .getElementsByName("modal-gender")
      .forEach((r) => (r.checked = false));

    currentCustomerAvatar = "";
    const preview = document.getElementById("modal-avatar-preview");
    preview.style.backgroundImage = "none";
    preview.innerHTML =
      '<span class="material-symbols-outlined text-4xl">person_add</span>';

    modal.classList.remove("hidden");
    return;
  }

  // NẾU LÀ XEM/SỬA -> Gọi API lấy dữ liệu như cũ
  try {
    const res = await fetch(
      `${AppConfig.BASE_URL}/users/admin/customers/${id}`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (!res.ok) throw new Error("Không thể lấy dữ liệu khách hàng");
    const data = await res.json();

    document.getElementById("modal-user-id").value = data.userId;
    document.getElementById("modal-fullname").value = data.fullName || "";
    document.getElementById("modal-email").value = data.email || "";
    document.getElementById("modal-phone").value = data.phoneNumber || "";
    document.getElementById("modal-dob").value = data.birthDate || "";
    document.getElementById("modal-password").value = ""; // Luôn ẩn mật khẩu khi xem/sửa

    if (data.gender !== null && data.gender !== undefined) {
      document.querySelector(
        `input[name="modal-gender"][value="${data.gender}"]`,
      ).checked = true;
    } else {
      document
        .getElementsByName("modal-gender")
        .forEach((r) => (r.checked = false));
    }

    currentCustomerAvatar = data.avatar;
    const preview = document.getElementById("modal-avatar-preview");
    if (data.avatar) {
      preview.style.backgroundImage = `url('${data.avatar}')`;
      preview.innerHTML = "";
    } else {
      preview.style.backgroundImage = "none";
      preview.innerHTML = UIUtils.getInitials(data.fullName);
    }

    modal.classList.remove("hidden");
  } catch (error) {
    alert("Lỗi: " + error.message);
  }
}

function closeCustomerModal() {
  document.getElementById("customer-modal").classList.add("hidden");
}

// Bắt sự kiện chọn ảnh trong Modal
document
  .getElementById("modal-avatar-input")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      modalAvatarFile = file;
      const reader = new FileReader();
      reader.onload = function (event) {
        const preview = document.getElementById("modal-avatar-preview");
        preview.style.backgroundImage = `url('${event.target.result}')`;
        preview.innerHTML = "";
      };
      reader.readAsDataURL(file);
    }
  });

async function saveCustomerDetails() {
  const id = document.getElementById("modal-user-id").value;
  const isAdd = !id; // Nếu không có ID tức là đang Thêm Mới
  const btn = document.getElementById("btn-save-customer");

  const fullName = document.getElementById("modal-fullname").value.trim();
  const email = document.getElementById("modal-email").value.trim();
  const phone = document.getElementById("modal-phone").value.trim();
  const password = document.getElementById("modal-password").value;
  const dob = document.getElementById("modal-dob").value;
  const genderEl = document.querySelector('input[name="modal-gender"]:checked');
  const gender = genderEl ? parseInt(genderEl.value) : null;

  if (!fullName || !email) {
    alert("Họ tên và Email không được để trống!");
    return;
  }

  if (isAdd && !password) {
    alert("Vui lòng nhập mật khẩu khởi tạo cho khách hàng mới!");
    return;
  }

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    let avatarUrlToSave = currentCustomerAvatar;

    if (modalAvatarFile) {
      const formData = new FormData();
      formData.append("file", modalAvatarFile);
      const uploadRes = await fetch(
        `${AppConfig.BASE_URL}/users/admin/upload-avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
          body: formData,
        },
      );
      if (uploadRes.ok) {
        avatarUrlToSave = await uploadRes.text();
      } else {
        throw new Error("Lỗi upload ảnh đại diện!");
      }
    }

    const payload = {
      fullName: fullName,
      email: email,
      phoneNumber: phone,
      gender: gender,
      birthDate: dob || null,
      avatar: avatarUrlToSave,
    };

    if (isAdd) payload.password = password; // Đính kèm pass nếu là tạo mới

    const endpoint = isAdd
      ? `${AppConfig.BASE_URL}/users/admin/customers`
      : `${AppConfig.BASE_URL}/users/admin/customers/${id}`;

    const method = isAdd ? "POST" : "PUT";

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert(
        isAdd
          ? "Tạo khách hàng mới thành công!"
          : "Cập nhật thông tin thành công!",
      );
      closeCustomerModal();
      loadCustomerStats();
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Lỗi kết nối máy chủ!");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu thay đổi");
  }
}
