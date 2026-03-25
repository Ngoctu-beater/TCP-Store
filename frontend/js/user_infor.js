document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

async function loadUserProfile() {
  if (!AuthUtils.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (res.status === 403) {
      alert("Phiên đăng nhập hết hạn.");
      AuthUtils.logout();
      return;
    }

    if (!res.ok) throw new Error("Lỗi tải thông tin");

    const data = await res.json();
    fillUserProfile(data);
    HeaderLogic.updateHeaderState();
  } catch (e) {
    console.error(e);
  }
}

function fillUserProfile(data) {
  setInputAndText("profile-fullname", null, data.fullName);
  setInputAndText("input-email", "display-email", data.email);
  setInputAndText("input-phone", "display-phone", data.phoneNumber);

  const dobInput = document.getElementById("profile-dob");
  if (dobInput) dobInput.value = data.birthDate || "";
  const dobDisplay = document.getElementById("display-dob");
  if (dobDisplay) dobDisplay.innerText = data.birthDate || "";

  const genderMap = { 1: "gender-male", 0: "gender-female", 2: "gender-other" };
  ["gender-male", "gender-female", "gender-other"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  const radioId = genderMap[data.gender] || "gender-other";
  const radioBtn = document.getElementById(radioId);
  if (radioBtn) radioBtn.checked = true;

  const initials = UIUtils.getInitials(data.fullName);
  const initialEl = document.getElementById("avatar-initials");
  if (initialEl) initialEl.innerText = initials;
  updateAvatarUI(data.avatar);
}

async function handleUpdateProfile() {
  const btnSave = document.getElementById("btn-save-profile");

  const fullName = getValue("profile-fullname");
  const phoneNumber = getValue("input-phone");
  const birthDate = getValue("profile-dob");

  let gender = 2;
  if (document.getElementById("gender-male")?.checked) gender = 1;
  if (document.getElementById("gender-female")?.checked) gender = 0;

  const payload = { fullName, phoneNumber, birthDate, gender };

  UIUtils.setLoading(btnSave, true, "Đang lưu...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${AuthUtils.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updatedUser = await res.json();
      alert("Cập nhật thành công!");

      const isRemember = !!localStorage.getItem(AppConfig.KEYS.TOKEN);
      AuthUtils.saveAuthData(AuthUtils.getToken(), updatedUser, isRemember);

      fillUserProfile(updatedUser);
      HeaderLogic.updateHeaderState();
      document
        .querySelectorAll('[id^="input-"]')
        .forEach((el) => el.classList.add("hidden"));
      document
        .querySelectorAll('[id^="display-"]')
        .forEach((el) => el.classList.remove("hidden"));
      syncReviewsUserInfo();
    } else {
      alert("Cập nhật thất bại.");
    }
  } catch (error) {
    alert("Lỗi kết nối.");
  } finally {
    UIUtils.setLoading(btnSave, false, "Lưu thay đổi");
  }
}

async function handleUploadAvatar(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  if (file.size > 1048576) return alert("File quá lớn (>1MB)");

  const formData = new FormData();
  formData.append("file", file);

  const container = document.querySelector(".size-32"); // Vùng avatar lớn
  if (container) container.style.opacity = "0.5";

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      body: formData,
    });

    if (res.ok) {
      const newUrl = await res.text();

      const isRemember = !!localStorage.getItem(AppConfig.KEYS.TOKEN);
      const storage = isRemember ? localStorage : sessionStorage;
      storage.setItem(AppConfig.KEYS.AVATAR, newUrl);

      updateAvatarUI(newUrl);
      HeaderLogic.updateHeaderState();
      alert("Đã đổi ảnh đại diện!");
      syncReviewsUserInfo();
    }
  } catch (e) {
    alert("Lỗi upload.");
  } finally {
    if (container) container.style.opacity = "1";
    inputElement.value = "";
  }
}

function togglePasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) {
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) resetPasswordForm();
  }
}

function resetPasswordForm() {
  ["current-pass", "new-pass", "confirm-pass"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function handleChangePassword() {
  const currentPassword = document.getElementById("current-pass").value;
  const newPassword = document.getElementById("new-pass").value;
  const confirmationPassword = document.getElementById("confirm-pass").value;
  const btn = document.getElementById("btn-change-pass");
  if (currentPassword === newPassword) {
    alert("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
    return;
  }
  if (!currentPassword || !newPassword || !confirmationPassword)
    return alert("Nhập đủ thông tin!");
  if (newPassword.length < 8) return alert("Mật khẩu mới phải >= 8 ký tự.");
  if (newPassword !== confirmationPassword)
    return alert("Mật khẩu xác nhận không khớp.");

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/change-password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${AuthUtils.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmationPassword,
      }),
    });

    if (res.ok) {
      alert("Đổi mật khẩu thành công!");
      togglePasswordModal();
      resetPasswordForm();
    } else {
      const txt = await res.text();
      try {
        alert(JSON.parse(txt).message);
      } catch (e) {
        alert(txt);
      }
    }
  } catch (error) {
    alert("Lỗi server.");
  } finally {
    UIUtils.setLoading(btn, false, "Cập nhật mật khẩu");
  }
}

function updateAvatarUI(url) {
  const img = document.getElementById("avatar-img");
  if (!img) return;
  if (url && url.startsWith("http")) {
    img.src = url;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }
}
function setInputAndText(inputId, displayId, val) {
  const v = val || "";
  const inp = document.getElementById(inputId);
  if (inp) inp.value = v;
  const disp = document.getElementById(displayId);
  if (disp) disp.innerText = v;
}
function getValue(id) {
  return document.getElementById(id)?.value || "";
}
function enableEdit(field) {
  const d = document.getElementById(`display-${field}`);
  const i = document.getElementById(`input-${field}`);
  if (d && i) {
    d.classList.add("hidden");
    i.classList.remove("hidden");
    i.focus();
  }
}
function togglePassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("span");
  input.type = input.type === "password" ? "text" : "password";
  icon.innerText = input.type === "password" ? "visibility_off" : "visibility";
}

async function syncReviewsUserInfo() {
  try {
    const token = AuthUtils.getToken();
    const fullName =
      AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
    const avatar = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR) || "";

    await fetch(`${AppConfig.PRODUCT_API_URL}/products/reviews/sync`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: fullName,
        avatar: avatar,
      }),
    });
    console.log("Đã đồng bộ thông tin đánh giá thành công!");
  } catch (e) {
    console.error("Lỗi đồng bộ đánh giá:", e);
  }
}
