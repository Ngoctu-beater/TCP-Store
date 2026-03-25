document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();

  // Gắn sự kiện thay đổi ảnh để hiển thị Preview
  const avatarInput = document.getElementById("admin-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        selectedAvatarFile = file; // Lưu vào biến toàn cục để dùng khi bấm Lưu
        const reader = new FileReader();
        reader.onload = function (event) {
          const preview = document.getElementById("admin-avatar-preview");
          preview.style.backgroundImage = `url('${event.target.result}')`;
          preview.innerHTML = ""; // Xóa chữ viết tắt nếu có
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

let selectedAvatarFile = null;

// ĐỔ DỮ LIỆU LÊN FORM
function loadAdminData() {
  const fullName = AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "";
  const email = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL) || "";
  const phone = AuthUtils.getUserInfo(AppConfig.KEYS.PHONE) || "";
  const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);

  document.getElementById("admin-fullname").value = fullName;
  document.getElementById("admin-email").value = email;
  document.getElementById("admin-phone").value = phone;

  const preview = document.getElementById("admin-avatar-preview");
  if (avatarUrl && avatarUrl !== "null" && avatarUrl.startsWith("http")) {
    preview.style.backgroundImage = `url('${avatarUrl}')`;
    preview.innerHTML = "";
  } else {
    preview.style.backgroundImage = "none";
    preview.innerHTML = `<span class="tracking-wide">${UIUtils.getInitials(fullName)}</span>`;
  }
}

// XỬ LÝ LƯU THÔNG TIN
async function updateAdminProfile() {
  const btn = document.getElementById("btn-update-profile");
  const fullName = document.getElementById("admin-fullname").value.trim();
  const email = document.getElementById("admin-email").value.trim();
  const phone = document.getElementById("admin-phone").value.trim();
  let currentAvatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR) || "";

  if (!fullName || !email || !phone) {
    alert("Vui lòng không để trống các thông tin bắt buộc!");
    return;
  }

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    // --- UPLOAD ẢNH NẾU CÓ ---
    if (selectedAvatarFile) {
      const formData = new FormData();
      formData.append("file", selectedAvatarFile);

      const uploadRes = await fetch(`${AppConfig.BASE_URL}/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
        body: formData,
      });

      if (uploadRes.ok) {
        currentAvatarUrl = await uploadRes.text(); // Lấy URL ảnh mới trả về
      } else {
        alert("Lỗi upload ảnh! Vui lòng thử lại.");
        UIUtils.setLoading(btn, false, "Lưu thay đổi");
        return;
      }
    }

    // --- GỌI API CẬP NHẬT HỒ SƠ ---
    const response = await fetch(`${AppConfig.BASE_URL}/users/admin/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify({
        fullName: fullName,
        email: email,
        phoneNumber: phone,
        avatar: currentAvatarUrl,
      }),
    });

    if (response.ok) {
      alert("Cập nhật thông tin thành công!");
      selectedAvatarFile = null; // Reset file đã chọn

      const currentEmail = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL);
      // NẾU ADMIN ĐỔI EMAIL -> BẮT ĐĂNG NHẬP LẠI
      if (email !== currentEmail) {
        alert(
          "Bạn vừa thay đổi Email đăng nhập. Hệ thống sẽ tự động đăng xuất!",
        );
        AuthUtils.logout(true); // <-- TRUYỀN 'true' VÀO ĐÂY
      } else {
        // Nếu chỉ đổi thông tin khác -> Cập nhật bộ nhớ và tải lại Header
        const userData = {
          userId: AuthUtils.getUserInfo(AppConfig.KEYS.USER_ID),
          fullName: fullName,
          email: email,
          phone: phone,
          avatar: currentAvatarUrl,
          role: AuthUtils.getUserInfo(AppConfig.KEYS.ROLE),
        };
        AuthUtils.saveAuthData(
          AuthUtils.getToken(),
          userData,
          localStorage.getItem(AppConfig.KEYS.TOKEN) !== null,
        );
        if (typeof HeaderLogic !== "undefined") HeaderLogic.updateHeaderState();
      }
    } else {
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi kết nối đến máy chủ!");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu thay đổi");
  }
}

// XỬ LÝ ĐỔI MẬT KHẨU
async function changeAdminPassword() {
  const btn = document.getElementById("btn-change-password");

  // Lấy dữ liệu từ các ô input
  const currentPass = document.getElementById("admin-current-pass").value;
  const newPass = document.getElementById("admin-new-pass").value;
  const confirmPass = document.getElementById("admin-confirm-pass").value;

  // Kiểm tra rỗng
  if (!currentPass || !newPass || !confirmPass) {
    alert("Vui lòng điền đầy đủ các trường mật khẩu!");
    return;
  }

  // --- KIỂM TRA MẬT KHẨU MỚI TRÙNG MẬT KHẨU CŨ ---
  if (currentPass === newPass) {
    alert("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
    document.getElementById("admin-new-pass").focus();
    return;
  }

  // Kiểm tra độ dài an toàn
  if (newPass.length < 6) {
    alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    document.getElementById("admin-new-pass").focus();
    return;
  }

  // Kiểm tra khớp mật khẩu xác nhận
  if (newPass !== confirmPass) {
    alert("Mật khẩu xác nhận không khớp!");
    document.getElementById("admin-confirm-pass").focus();
    return;
  }

  // Hiển thị trạng thái loading
  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    // GỌI API ĐỔI MẬT KHẨU
    const response = await fetch(
      `${AppConfig.BASE_URL}/users/change-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Đính kèm Token của Admin
          Authorization: `Bearer ${AuthUtils.getToken()}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
          confirmationPassword: confirmPass,
        }),
      },
    );

    if (response.ok) {
      alert(
        "Đổi mật khẩu thành công! Hệ thống sẽ tự động đăng xuất để bảo mật.",
      );

      // Ép Admin đăng nhập lại sau khi đổi mật khẩu thành công
      AuthUtils.logout(true); // <-- TRUYỀN 'true' VÀO ĐÂY
    } else {
      // Nếu sai mật khẩu cũ, Backend sẽ trả về lỗi
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (error) {
    console.error("Lỗi gọi API:", error);
    alert("Lỗi kết nối đến máy chủ! Vui lòng thử lại sau.");
  } finally {
    // Trả lại trạng thái ban đầu cho nút
    UIUtils.setLoading(btn, false, "Cập nhật mật khẩu");

    // Làm rỗng các ô input nếu đổi thất bại
    document.getElementById("admin-current-pass").value = "";
    document.getElementById("admin-new-pass").value = "";
    document.getElementById("admin-confirm-pass").value = "";
  }
}
