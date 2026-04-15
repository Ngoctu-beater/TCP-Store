const AppConfig = {
  BASE_URL: "http://localhost:8081/api",
  PRODUCT_API_URL: "http://localhost:8082/api",
  CART_API_URL: "http://localhost:8083/api/cart",
  ORDER_API_URL: "http://localhost:8084/api/orders",
  KEYS: {
    TOKEN: "accessToken",
    USER_ID: "userId",
    EMAIL: "userEmail",
    FULL_NAME: "userFullName",
    ROLE: "userRole",
    AVATAR: "userAvatar",
    PHONE: "userPhone",
  },
};

const AuthUtils = {
  getToken() {
    return (
      sessionStorage.getItem(AppConfig.KEYS.TOKEN) ||
      localStorage.getItem(AppConfig.KEYS.TOKEN)
    );
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  getUserInfo(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  },
  saveAuthData(token, userData, isRemember = false) {
    const storage = isRemember ? localStorage : sessionStorage;
    const otherStorage = isRemember ? sessionStorage : localStorage;
    otherStorage.clear();

    storage.setItem(AppConfig.KEYS.TOKEN, token);
    if (userData) {
      if (userData.userId)
        storage.setItem(AppConfig.KEYS.USER_ID, userData.userId);
      if (userData.email) storage.setItem(AppConfig.KEYS.EMAIL, userData.email);
      if (userData.fullName)
        storage.setItem(AppConfig.KEYS.FULL_NAME, userData.fullName);
      if (userData.role) storage.setItem(AppConfig.KEYS.ROLE, userData.role);
      if (userData.avatar)
        storage.setItem(AppConfig.KEYS.AVATAR, userData.avatar);
      if (userData.phone) storage.setItem(AppConfig.KEYS.PHONE, userData.phone);
    }
  },
  logout(force = false) {
    if (!force) {
      if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        return;
      }
    }

    Object.values(AppConfig.KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.replace("login.html");
  },
  parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  },
  requireAdmin() {
    if (!this.isLoggedIn()) {
      alert("Vui lòng đăng nhập để truy cập trang quản trị!");
      window.location.href = "login.html";
      return false;
    }
    const role = this.getUserInfo(AppConfig.KEYS.ROLE);

    if (role !== "ADMIN" && role !== "ROLE_ADMIN") {
      alert("Truy cập bị từ chối! Bạn không có quyền quản trị viên.");
      window.location.href = "home.html";
      return false;
    }
    return true;
  },
};

const UIUtils = {
  setLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (text) btn.innerText = text;
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector("span");
    if (!input || !icon) return;

    if (input.type === "password") {
      input.type = "text";
      icon.innerText = "visibility";
    } else {
      input.type = "password";
      icon.innerText = "visibility_off";
    }
  },

  getInitials(name) {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "US";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  toggleUserMenu() {
    const menu = document.getElementById("user-dropdown");
    if (menu) menu.classList.toggle("hidden");
  },
  renderBreadcrumb(containerId, paths) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <nav class="flex mb-6 text-sm text-gray-500 dark:text-gray-400">
        <ol class="inline-flex items-center space-x-1 md:space-x-3">
          <li class="inline-flex items-center">
            <a class="hover:text-primary transition-colors" href="home.html">Trang chủ</a>
          </li>
    `;

    paths.forEach((path) => {
      html += `
          <li>
            <div class="flex items-center">
              <span class="material-symbols-outlined text-base mx-1">chevron_right</span>
              ${
                path.url
                  ? `<a href="${path.url}" class="hover:text-primary transition-colors">${path.label}</a>`
                  : `<span class="font-medium text-gray-800 dark:text-gray-200">${path.label}</span>`
              }
            </div>
          </li>
      `;
    });

    html += `
        </ol>
      </nav>
    `;

    container.innerHTML = html;
  },

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  },

  setLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (text) btn.innerText = text;
  },
};

const HeaderLogic = {
  updateHeaderState() {
    const isLoggedIn = AuthUtils.isLoggedIn();
    const guestActions = document.getElementById("guest-actions");
    const userActions = document.getElementById("user-actions");

    if (guestActions && userActions) {
      if (isLoggedIn) {
        guestActions.classList.add("hidden");
        guestActions.classList.remove("flex");
        userActions.classList.remove("hidden");
        userActions.classList.add("flex");

        const fullName =
          AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
        const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);
        const email = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL);

        this.updateCartBadge();

        if (fullName) {
          const initials = UIUtils.getInitials(fullName);
          document
            .querySelectorAll(".header-avatar-initials")
            .forEach((el) => (el.innerText = initials));
          document
            .querySelectorAll(".display-name-global")
            .forEach((el) => (el.innerText = fullName));
        }

        const hasAvatar =
          avatarUrl &&
          avatarUrl !== "null" &&
          avatarUrl.trim() !== "" &&
          avatarUrl.startsWith("http");
        document.querySelectorAll(".header-avatar-img").forEach((img) => {
          if (hasAvatar) {
            img.src = avatarUrl;
            img.classList.remove("hidden");
          } else {
            img.classList.add("hidden");
            img.src = "";
          }
        });

        const dropName = document.getElementById("dropdown-name");
        if (dropName) dropName.innerText = fullName;
        const dropEmail = document.getElementById("dropdown-email");
        if (dropEmail) dropEmail.innerText = email;
      } else {
        guestActions.classList.remove("hidden");
        guestActions.classList.add("flex");
        userActions.classList.add("hidden");
      }
    }

    const adminNameEl = document.getElementById("admin-display-name");
    const adminRoleEl = document.getElementById("admin-role-name");
    const adminAvatarEl = document.getElementById("admin-avatar");
    const adminInitialsEl = document.getElementById("admin-initials");

    if (adminNameEl && isLoggedIn) {
      const fullName =
        AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Admin";
      const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);
      const role = AuthUtils.getUserInfo(AppConfig.KEYS.ROLE);
      const initials = UIUtils.getInitials(fullName);

      adminNameEl.innerText = fullName;

      if (adminRoleEl) {
        adminRoleEl.innerText =
          role === "ADMIN" || role === "ROLE_ADMIN"
            ? "Quản trị viên"
            : "Nhân viên";
      }

      if (adminAvatarEl) {
        const hasAvatar =
          avatarUrl &&
          avatarUrl !== "null" &&
          avatarUrl.trim() !== "" &&
          avatarUrl.startsWith("http");
        if (hasAvatar) {
          adminAvatarEl.style.backgroundImage = `url('${avatarUrl}')`;
          adminAvatarEl.classList.remove("bg-primary");
          if (adminInitialsEl) adminInitialsEl.style.display = "none";
        } else {
          adminAvatarEl.style.backgroundImage = "none";
          adminAvatarEl.classList.add("bg-primary");
          if (adminInitialsEl) {
            adminInitialsEl.style.display = "block";
            adminInitialsEl.innerText = initials;
          }
        }
      }
    }
  },

  getCategoryIcon(name) {
    const n = name.toLowerCase();
    if (n.includes("laptop")) return "laptop_mac";
    if (n.includes("điện thoại")) return "smartphone";
    if (n.includes("tivi")) return "tv";
    if (n.includes("đồng hồ")) return "watch";
    return "grid_view";
  },

  async loadCategories() {
    const container = document.getElementById("category-list-container");
    if (!container) return;

    try {
      const response = await fetch(
        `${AppConfig.PRODUCT_API_URL}/categories/tree`,
      );
      if (!response.ok) throw new Error("Err");
      const categories = await response.json();

      container.innerHTML = "";

      categories.forEach((cat) => {
        const hasChildren = cat.children && cat.children.length > 0;
        const icon = this.getCategoryIcon(cat.name);
        const item = document.createElement("div");
        item.className =
          "category-item group flex items-center justify-between px-6 py-3.5 hover:bg-white dark:hover:bg-[#25282c] transition-colors cursor-pointer border-l-2 border-transparent hover:border-primary";

        let htmlContent = `
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">${icon}</span>
                        <span class="font-semibold text-sm group-hover:text-primary transition-colors">${cat.name}</span>
                    </div>`;

        if (hasChildren) {
          htmlContent += `
                        <span class="material-symbols-outlined text-sm text-gray-400">chevron_right</span>
                        <div class="subcategory-panel hidden absolute top-0 left-64 w-[calc(100%-16rem)] h-full bg-white dark:bg-[#1e2125] p-8 z-50 overflow-y-auto border-l border-gray-100 dark:border-gray-800">
                            <div class="flex flex-col gap-6">
                                <div>
                                    <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">${cat.name}</h3>
                                    <div class="grid grid-cols-2 gap-x-8 gap-y-3">
                                        ${cat.children
                                          .map(
                                            (child) => `
                                            <a href="products.html?category=${child.id}" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors flex items-center gap-2 group/sub">
                                                <span class="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 group-hover/sub:bg-primary transition-colors"></span>
                                                ${child.name}
                                            </a>
                                        `,
                                          )
                                          .join("")}
                                    </div>
                                </div>
                            </div>
                        </div>`;
        }
        item.innerHTML = htmlContent;
        item.addEventListener("click", (e) => {
          if (!e.target.closest(".subcategory-panel")) {
            window.location.href = `products.html?category=${cat.id}`;
          }
        });
        container.appendChild(item);
      });
    } catch (error) {
      console.error("Lỗi tải danh mục:", error);
      container.innerHTML = `<p class="text-center text-red-500 text-xs">Lỗi kết nối</p>`;
    }
  },
  initSearch() {
    const searchInputs = [
      document.getElementById("search-input-desktop"),
      document.getElementById("search-input-mobile"),
    ];

    searchInputs.forEach((input) => {
      if (input) {
        input.addEventListener("keypress", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            const keyword = this.value.trim();

            if (keyword) {
              window.location.href = `products.html?search=${encodeURIComponent(keyword)}`;
            }
          }
        });
      }
    });
  },
  async updateCartBadge() {
    const badges = document.querySelectorAll(".global-cart-badge");
    if (badges.length === 0) return;

    if (!AuthUtils.isLoggedIn()) {
      badges.forEach((b) => b.classList.add("hidden"));
      return;
    }

    try {
      const response = await fetch(AppConfig.CART_API_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      });

      if (response.ok) {
        const cart = await response.json();
        const totalItems = cart.totalItems || 0;

        badges.forEach((b) => {
          if (totalItems > 0) {
            b.innerText = totalItems;
            b.classList.remove("hidden");
          } else {
            b.classList.add("hidden");
          }
        });
      }
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng:", error);
    }
  },
};

const SidebarLogic = {
  init() {
    const currentPath =
      window.location.pathname.split("/").pop() || "user_infor.html";
    const links = document.querySelectorAll("#sidebar-nav .sidebar-link");

    links.forEach((link) => {
      const href = link.getAttribute("href");

      if (href === currentPath) {
        link.className =
          "sidebar-link flex items-center gap-3 px-4 py-2.5 text-primary font-semibold bg-[#f0f5f5] dark:bg-[#25282c] rounded-lg transition-colors";
        const icon = link.querySelector("span");
        if (icon) icon.className = "material-symbols-outlined text-[20px]";
      } else {
        link.className =
          "sidebar-link flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-[#f0f5f5] dark:hover:bg-[#25282c] rounded-lg transition-colors group";
        const icon = link.querySelector("span");
        if (icon)
          icon.className =
            "material-symbols-outlined text-[20px] group-hover:text-primary transition-colors";
      }
    });
  },
};

const AdminSidebarLogic = {
  init() {
    const currentPath =
      window.location.pathname.split("/").pop() || "dashboard.html";

    const sidebar = document.getElementById("admin-sidebar-placeholder");
    if (!sidebar) return;

    const links = sidebar.querySelectorAll("a");

    links.forEach((link) => {
      const href = link.getAttribute("href");
      const iconSpan = link.querySelector("span.material-symbols-outlined");

      if (href === currentPath) {
        link.className =
          "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary group";
        if (iconSpan) {
          iconSpan.classList.add("filled");
          iconSpan.classList.remove("group-hover:text-[#111417]");
        }
      } else {
        if (href.includes("logout")) {
          link.className =
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-auto";
        } else {
          link.className =
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#637588] hover:bg-[#f0f2f4] hover:text-[#111417] transition-colors group";
          if (iconSpan) {
            iconSpan.classList.remove("filled");
            iconSpan.classList.add("group-hover:text-[#111417]");
          }
        }
      }
    });
  },
};

async function loadSharedComponents() {
  try {
    const isAdminPage =
      document.getElementById("admin-sidebar-placeholder") !== null;

    if (isAdminPage) {
      if (!AuthUtils.requireAdmin()) {
        return;
      }
    }

    const headerPlaceholder = document.getElementById("header-placeholder");
    if (headerPlaceholder) {
      const headerRes = await fetch("components/header.html");
      if (headerRes.ok) headerPlaceholder.innerHTML = await headerRes.text();
    }

    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (footerPlaceholder) {
      const footerRes = await fetch("components/footer.html");
      if (footerRes.ok) footerPlaceholder.innerHTML = await footerRes.text();
    }
    
    const sidebarPlaceholder = document.getElementById("sidebar-placeholder");
    if (sidebarPlaceholder) {
      const sidebarRes = await fetch("components/sidebar.html");
      if (sidebarRes.ok) {
        sidebarPlaceholder.innerHTML = await sidebarRes.text();
        SidebarLogic.init();
      }
    }

    const adminHeaderPlaceholder = document.getElementById(
      "admin-header-placeholder",
    );
    if (adminHeaderPlaceholder) {
      const headerRes = await fetch("components/header_admin.html");
      if (headerRes.ok)
        adminHeaderPlaceholder.innerHTML = await headerRes.text();
    }

    const adminSidebarPlaceholder = document.getElementById(
      "admin-sidebar-placeholder",
    );
    if (adminSidebarPlaceholder) {
      const sidebarRes = await fetch("components/sidebar_admin.html");
      if (sidebarRes.ok) {
        adminSidebarPlaceholder.innerHTML = await sidebarRes.text();
        AdminSidebarLogic.init();
      }
    }

    HeaderLogic.updateHeaderState();
    HeaderLogic.loadCategories();
    HeaderLogic.initSearch();
  } catch (error) {
    console.error("Lỗi tải thành phần chung:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadSharedComponents);

window.toggleUserMenu = UIUtils.toggleUserMenu;
window.addEventListener("click", (e) => {
  const btn = document.getElementById("user-menu-btn");
  const menu = document.getElementById("user-dropdown");
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add("hidden");
  }
});