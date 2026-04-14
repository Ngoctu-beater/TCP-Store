// Biến toàn cục
let currentPage = 0;
let currentCategoryId = null;
let currentKeyword = null;
const PAGE_SIZE = 32;
let currentSortBy = "createdAt";
let currentSortDir = "desc";

// Lưu trạng thái bộ lọc
let activeFilters = {};
let currentMinPrice = null;
let currentMaxPrice = null;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentCategoryId = urlParams.get("category") || urlParams.get("categoryId");
  currentKeyword = urlParams.get("search");

  // Xử lý sự kiện thay đổi sắp xếp
  const sortSelect = document.getElementById("sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const [sortBy, sortDir] = this.value.split("-");
      currentSortBy = sortBy;
      currentSortDir = sortDir;
      loadProducts(0);
    });
  }

  if (currentCategoryId) {
    await initDynamicFilters(currentCategoryId);
  } else {
    // Nếu không có categoryId trên URL -> Xóa chữ "Đang tải" và thông báo
    const container = document.getElementById("dynamic-specs-container");
    if(container) {
        container.innerHTML = `<div class="text-sm text-gray-400 italic">Vui lòng chọn một danh mục cụ thể!</div>`;
    }
  }

  // Tải dữ liệu lần đầu
  if (currentKeyword !== null) {
    loadProducts(0);
  } else if (currentCategoryId) {
    loadProducts(0);
  } else {
    currentKeyword = "";
    loadProducts(0);
  }
});

// Khởi tạo cấu hình và vẽ nút lọc
async function initDynamicFilters(categoryId) {
    const container = document.getElementById("dynamic-specs-container");
    if (!container) return;

    try {
        // Lấy toàn bộ giao diện từ API siêu tốc vừa làm
        const filterResponse = await fetch(`${AppConfig.PRODUCT_API_URL}/products/category/${categoryId}/filters`);
        if (!filterResponse.ok) return;
        
        const filterData = await filterResponse.json();
        
        const labels = filterData.labels || {};
        const filters = filterData.filters || {};

        let htmlParts = Object.keys(filters).map(key => {
            const labelName = labels[key] || key.toUpperCase();
            const options = filters[key] || [];
            
            if (options.length === 0) return '';

            return `
            <div class="filter-group mb-5">
                <h4 class="text-sm font-bold mb-3 text-gray-800 dark:text-gray-200">${labelName}</h4>
                <div class="flex flex-wrap gap-2">
                    ${options.map(opt => {
                        const cleanOpt = String(opt).replace(/^"|"$/g, '');
                        const safeVal = cleanOpt.replace(/'/g, "\\'");
                        
                        return `
                        <button class="filter-chip px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors" 
                                data-key="${key}" data-val="${cleanOpt}"
                                onclick="toggleFilter('${key}', '${safeVal}', this)">
                            ${cleanOpt}
                        </button>`
                    }).join('')}
                </div>
            </div>`;
        });

        const finalHtml = htmlParts.join('').trim();
        container.innerHTML = finalHtml === '' 
            ? `<div class="text-sm text-gray-400">Hiện chưa có thông số để lọc.</div>` 
            : finalHtml;

    } catch (e) { 
        console.error("LỖI BỘ LỌC:", e); 
    }
}

// Click chọn/bỏ chọn một thông số
function toggleFilter(key, value, element) {
  if (activeFilters[key] === value) {
    delete activeFilters[key]; // Bỏ chọn
    element.classList.remove("bg-primary", "text-[#101818]", "border-primary");
    element.classList.add("text-gray-600", "dark:text-gray-400");
  } else {
    // Bỏ active nút cũ cùng nhóm
    element.parentNode.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("bg-primary", "text-[#101818]", "border-primary");
      btn.classList.add("text-gray-600", "dark:text-gray-400");
    });
    // Active nút mới
    activeFilters[key] = value;
    element.classList.remove("text-gray-600", "dark:text-gray-400");
    element.classList.add("bg-primary", "text-[#101818]", "border-primary");
  }
  loadProducts(0);
}

// Nút áp dụng giá
function applyFilters() {
  currentMinPrice = document.getElementById("min-price").value || null;
  currentMaxPrice = document.getElementById("max-price").value || null;
  loadProducts(0);
}

// Xóa toàn bộ lọc
function resetFilters() {
  const minPriceEl = document.getElementById("min-price");
  const maxPriceEl = document.getElementById("max-price");
  if (minPriceEl) minPriceEl.value = "";
  if (maxPriceEl) maxPriceEl.value = "";

  currentMinPrice = null;
  currentMaxPrice = null;
  activeFilters = {};

  document.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.classList.remove("bg-primary", "text-[#101818]", "border-primary");
    btn.classList.add("text-gray-600", "dark:text-gray-400");
  });
  loadProducts(0);
}

async function loadProducts(page) {
  currentPage = page;

  const productListEl = document.getElementById("product-list");
  const emptyStateEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("category-title");
  const countEl = document.getElementById("product-count");
  const paginationEl = document.getElementById("pagination");

  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    let pageTitle = "Tất cả sản phẩm";
    let breadcrumbPaths = [];

    // Gộp tất cả URL gọi về API /search để hỗ trợ filter đa tham số
    let apiUrl = `${AppConfig.PRODUCT_API_URL}/products/search?page=${page}&limit=${PAGE_SIZE}&sortBy=${currentSortBy}&sortDir=${currentSortDir}`;

    // Tham số Tìm kiếm
    if (currentKeyword !== null && currentKeyword !== "") {
      apiUrl += `&keyword=${encodeURIComponent(currentKeyword)}`;
      pageTitle = `Kết quả tìm kiếm cho: "${currentKeyword}"`;
      breadcrumbPaths.push({ label: "Tìm kiếm sản phẩm" });
    }

    // Tham số Danh mục
    if (currentCategoryId) {
      apiUrl += `&categoryId=${currentCategoryId}`;

      // Tải tên danh mục để vẽ Breadcrumb
      try {
        const catResponse = await fetch(
          `${AppConfig.PRODUCT_API_URL}/categories/${currentCategoryId}`,
        );
        if (catResponse.ok) {
          const catData = await catResponse.json();
          const category = catData.data || catData;
          if (!currentKeyword)
            pageTitle = category.name || category.categoryName || pageTitle;

          if (category.parent) {
            breadcrumbPaths.push({
              label: category.parent.name,
              url: `products.html?categoryId=${category.parent.id}`,
            });
          }
        }
      } catch (e) {
        console.warn("Không tải được thông tin danh mục:", e);
      }
      if (!currentKeyword) breadcrumbPaths.push({ label: pageTitle });
    } else if (!currentKeyword) {
      breadcrumbPaths.push({ label: pageTitle });
    }

    // Tham số Bộ lọc
    let brandParam = activeFilters['brand'] || null;
    let specsObj = { ...activeFilters };
    delete specsObj["brand"];
    let specsParam =
      Object.keys(specsObj).length > 0 ? JSON.stringify(specsObj) : null;

    if (currentMinPrice) apiUrl += `&minPrice=${currentMinPrice}`;
    if (currentMaxPrice) apiUrl += `&maxPrice=${currentMaxPrice}`;
    if (brandParam) apiUrl += `&brand=${encodeURIComponent(brandParam)}`;
    if (specsParam) apiUrl += `&specs=${encodeURIComponent(specsParam)}`;

    // Vẽ giao diện Breadcrumb & Tiêu đề
    if (typeof UIUtils !== "undefined" && UIUtils.renderBreadcrumb) {
      UIUtils.renderBreadcrumb("breadcrumb-container", breadcrumbPaths);
    }
    if (titleEl) titleEl.innerText = pageTitle;

    // GỌI API
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Lỗi kết nối server");

    const data = await response.json();
    const products = data.content;

    // Xử lý hiển thị UI
    if (productListEl) {
      productListEl.innerHTML = "";
      productListEl.classList.remove("hidden");
    }
    if (emptyStateEl) emptyStateEl.classList.add("hidden");

    if (!products || products.length === 0) {
      showEmptyState(
        currentKeyword !== null
          ? "Không tìm thấy sản phẩm nào phù hợp"
          : "Danh mục chưa có sản phẩm",
      );
      if (titleEl) titleEl.innerText = pageTitle;
      if (countEl) countEl.innerText = "0";
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    if (countEl) countEl.innerText = data.totalElements;

    products.forEach((p) => {
      renderProductCard(p, productListEl);
    });

    renderPagination(data.totalPages, data.pageNo);
  } catch (error) {
    console.error("Lỗi frontend:", error);
    showEmptyState("Lỗi tải dữ liệu");
  }
}

function renderProductCard(p, container) {
  const salePrice = p.salePrice || 0;
  const basePrice = p.basePrice || 0;

  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(salePrice);
  const basePriceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(basePrice);

  let discountHtml = "";
  if (basePrice > salePrice) {
    const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
    discountHtml = `<div class="absolute top-3 left-3 z-10 bg-sale-red text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">-${percent}%</div>`;
  }

  const isStock = p.stock > 0;
  const statusText = isStock ? "Còn hàng" : "Hết hàng";
  const statusColor = isStock ? "text-emerald-500" : "text-red-500";
  const statusIcon = isStock ? "check_circle" : "cancel";

  const card = document.createElement("div");
  card.className =
    "group relative flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e2125] p-3 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500";

  card.innerHTML = `
        ${discountHtml}
        <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#f8f9fa] dark:bg-[#25282c]">
            <img 
                alt="${p.name}" 
                class="h-full w-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 mix-blend-multiply dark:mix-blend-normal"
                src="${p.thumbnail || "https://placehold.co/400x300?text=No+Image"}" 
                onerror="this.src='https://placehold.co/400x300?text=Error'"
            />
            <div class="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-white/95 dark:from-[#1e2125]/95 to-transparent">
            ${
              isStock
                ? `<button onclick="addToCart(${p.id}, this)" class="w-full bg-primary text-[#101818] py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
                    Thêm vào giỏ
                   </button>`
                : `<button disabled class="w-full bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 py-2 rounded-lg text-sm font-bold shadow-lg cursor-not-allowed flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-lg">remove_shopping_cart</span>
                    Hết hàng
                   </button>`
            }
        </div>
        </div>
        <div class="flex flex-col gap-1.5 flex-1">
            <h3 class="font-bold text-xs leading-snug line-clamp-2 min-h-[2.2rem] group-hover:text-primary transition-colors cursor-pointer" title="${p.name}">
                ${p.name}
            </h3>
            <div class="mt-auto pt-2 border-t border-gray-50 dark:border-gray-800">
                <div class="flex flex-col">
                    <span class="text-sale-red font-black text-sm md:text-base">${priceFormatted}</span>
                    ${basePrice > salePrice ? `<span class="text-gray-400 text-[10px] line-through font-normal">${basePriceFormatted}</span>` : ""}
                </div>
                <div class="flex items-center gap-1 mt-2 text-[10px] font-bold ${statusColor} uppercase tracking-tighter">
                    <span class="material-symbols-outlined text-xs">${statusIcon}</span>
                    ${statusText}
                </div>
            </div>
        </div>
      `;

  card.querySelector("h3").addEventListener("click", () => {
    window.location.href = `product_detail.html?id=${p.id}`;
  });

  if (container) container.appendChild(card);
}

function renderPagination(totalPages, pageNo) {
  const paginationEl = document.getElementById("pagination");
  if (!paginationEl) return;

  paginationEl.innerHTML = "";
  if (totalPages <= 1) return;

  const prevBtn = createPageButton(
    "chevron_left",
    pageNo > 0,
    () => changePage(pageNo - 1),
    true,
  );
  paginationEl.appendChild(prevBtn);

  let startPage = Math.max(0, pageNo - 2);
  let endPage = Math.min(totalPages - 1, pageNo + 2);

  if (endPage - startPage < 4) {
    if (startPage === 0) endPage = Math.min(totalPages - 1, startPage + 4);
    else if (endPage === totalPages - 1) startPage = Math.max(0, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const isCurrent = i === pageNo;
    const pageBtn = createPageButton(
      i + 1,
      true,
      () => changePage(i),
      false,
      isCurrent,
    );
    paginationEl.appendChild(pageBtn);
  }

  const nextBtn = createPageButton(
    "chevron_right",
    pageNo < totalPages - 1,
    () => changePage(pageNo + 1),
    true,
  );
  paginationEl.appendChild(nextBtn);
}

function createPageButton(
  text,
  isEnabled,
  onClick,
  isIcon = false,
  isActive = false,
) {
  const btn = document.createElement("button");
  let className =
    "size-10 flex items-center justify-center rounded-lg transition-colors ";

  if (isActive) {
    className += "bg-primary text-[#101818] font-bold shadow-md";
  } else {
    className +=
      "border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e2125] ";
    if (isEnabled) {
      className +=
        "text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary cursor-pointer";
    } else {
      className += "text-gray-300 dark:text-gray-800 cursor-not-allowed";
    }
  }

  btn.className = className;
  btn.disabled = !isEnabled;
  if (isIcon) {
    btn.innerHTML = `<span class="material-symbols-outlined">${text}</span>`;
  } else {
    btn.innerText = text;
  }
  if (isEnabled) {
    btn.addEventListener("click", onClick);
  }
  return btn;
}

function changePage(newPage) {
  if (newPage !== currentPage) {
    loadProducts(newPage);
  }
}

function showEmptyState(message) {
  const productListEl = document.getElementById("product-list");
  const emptyStateEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("category-title");
  const paginationEl = document.getElementById("pagination");

  if (productListEl) productListEl.classList.add("hidden");
  if (paginationEl) paginationEl.innerHTML = "";

  if (emptyStateEl) {
    emptyStateEl.classList.remove("hidden");
    emptyStateEl.classList.add("flex");
  }
  if (titleEl) titleEl.innerText = message;
}

async function addToCart(productId, buttonElement) {
  if (typeof AuthUtils !== "undefined" && !AuthUtils.isLoggedIn()) {
    alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "login.html";
    return;
  }

  const originalText = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Đang thêm...`;

  try {
    const token = AuthUtils.getToken();

    const response = await fetch(`${AppConfig.CART_API_URL}/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: productId,
        quantity: 1,
      }),
    });

    if (response.ok) {
      if (typeof HeaderLogic !== "undefined") {
        HeaderLogic.updateCartBadge();
      }

      alert("Đã thêm sản phẩm vào giỏ hàng!");
    } else {
      const errorData = await response.text();
      alert("Lỗi: " + (errorData || "Không thể thêm vào giỏ hàng"));
    }
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    alert("Lỗi kết nối đến máy chủ giỏ hàng!");
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalText;
  }
}
