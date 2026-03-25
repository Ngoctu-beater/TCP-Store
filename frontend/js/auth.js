async function handleAuthSuccess(token, isRemember) {
  if (!token) return alert("Lỗi token!");
  const decoded = AuthUtils.parseJwt(token);
  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let userDataToSave = {};

    if (res.ok) {
      const user = await res.json();
      userDataToSave = {
        userId: decoded.user_id,
        email: user.email,
        fullName: user.fullName,
        role: decoded.role_name,
        avatar: user.avatar,
        phone: user.phoneNumber || user.phone,
      };
    } else {
      userDataToSave = {
        userId: decoded.user_id,
        email: decoded.email,
        fullName: decoded.full_name,
        role: decoded.role_name,
        phone: decoded.phone || decoded.phone_number || decoded.phoneNumber,
      };
    }

    AuthUtils.saveAuthData(token, userDataToSave, isRemember);
  } catch (e) {
    console.error(e);
  }

  const role = decoded?.role_name || "USER";
  const routes = {
    ADMIN: "dashboard.html",
    USER: "home.html",
  };
  window.location.href = routes[role] || "home.html";
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const btn = document.getElementById("btn-login");

  const rememberMe = document.getElementById("remember-me")?.checked || false;

  if (!email || !password) return alert("Vui lòng nhập đủ thông tin!");

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

    await handleAuthSuccess(data.token, rememberMe);
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btn, false, "Đăng nhập");
  }
}

async function handleRegister() {
  const fullName = document.getElementById("reg-fullname").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const btnRegister = document.getElementById("btn-register");

  if (!fullName || !phone || !email || !password) {
    return alert("Nhập đủ thông tin!");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Vui lòng nhập đúng định dạng email (VD: nguyenvan_a@gmail.com)!");
    document.getElementById("reg-email").focus();
    return;
  }

  const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    alert(
      "Số điện thoại không hợp lệ! Vui lòng nhập số mạng Việt Nam gồm 10 chữ số.",
    );
    document.getElementById("reg-phone").focus();
    return;
  }

  if (password.length < 8) {
    alert("Mật khẩu phải có ít nhất 8 ký tự!");
    document.getElementById("reg-password").focus();
    return;
  }

  UIUtils.setLoading(btnRegister, true, "Đang tạo...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phoneNumber: phone, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Đăng ký thất bại");

    alert("Đăng ký thành công! Đang đăng nhập...");
    await handleAuthSuccess(data.token, false);
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btnRegister, false, "Tạo tài khoản");
  }
}

function toggleRegisterButton() {
  const checkbox = document.getElementById("terms");
  const btn = document.getElementById("btn-register"); 

  if (!checkbox || !btn) return;

  if (checkbox.checked) {
    btn.disabled = false;

    btn.classList.remove(
      "bg-gray-300",
      "dark:bg-gray-700",
      "text-gray-500",
      "cursor-not-allowed",
      "opacity-70",
    );

    btn.classList.add(
      "bg-primary",
      "hover:bg-primary/90",
      "text-[#101818]",
      "cursor-pointer",
      "shadow-lg",
      "hover:shadow-xl",
    );
  } else {
    btn.disabled = true;

    btn.classList.remove(
      "bg-primary",
      "hover:bg-primary/90",
      "text-[#101818]",
      "cursor-pointer",
      "shadow-lg",
      "hover:shadow-xl",
    );

    btn.classList.add(
      "bg-gray-300",
      "dark:bg-gray-700",
      "text-gray-500",
      "cursor-not-allowed",
      "opacity-70",
    );
  }
}
