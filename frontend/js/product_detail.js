document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (productId) {
    loadProductDetail(productId);
  } else {
    alert("Không tìm thấy ID sản phẩm");
    window.location.href = "products.html";
  }
});

async function loadProductDetail(id) {
  try {
    // Gọi API lấy chi tiết
    const response = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`);
    if (!response.ok) throw new Error("Lỗi tải sản phẩm");

    const p = await response.json();

    // --- ĐIỀN THÔNG TIN CƠ BẢN ---
    document.title = `${p.name} | VMAStore`;

    // Breadcrumb
    setText("breadcrumb-name", p.name);
    setText("breadcrumb-category", p.categoryName);

    // Info
    setText("p-name", p.name);
    setText("p-sku", p.sku);
    setText("p-sold", `Đã bán ${p.sold || 0}`);
    const brandEl = document.getElementById("p-brand");

    // Lấy giá trị từ key "brand" trong specs
    const brandValue = p.specs ? p.specs["brand"] : null;

    if (brandEl) {
      if (brandValue) {
        // Có thông tin -> Điền tên hãng
        brandEl.innerText = brandValue;

        // Hiển thị dòng "Thương hiệu: ..."
        brandEl.parentElement.classList.remove("hidden");
      } else {
        // Không có thông tin -> Ẩn toàn bộ dòng "Thương hiệu: ..."
        brandEl.parentElement.classList.add("hidden");
      }
    }

    // --- XỬ LÝ GIÁ BÁN ---
    const salePrice = p.salePrice || 0;
    const basePrice = p.basePrice || 0;

    setText("p-sale-price", formatCurrency(salePrice));

    const basePriceEl = document.getElementById("p-base-price");
    const discountEl = document.getElementById("p-discount-badge");

    if (basePrice > salePrice) {
      basePriceEl.innerText = formatCurrency(basePrice);
      basePriceEl.classList.remove("hidden");

      const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
      discountEl.innerText = `-${percent}%`;
      discountEl.classList.remove("hidden");
    } else {
      basePriceEl.classList.add("hidden");
      discountEl.classList.add("hidden");
    }

    // --- XỬ LÝ ẢNH (GALLERY) ---
    // Gộp thumbnail và list ảnh phụ
    const allImages = [p.thumbnail, ...(p.images || [])].filter(
      (img) => img && img.trim() !== "",
    );

    if (allImages.length > 0) {
      // Set ảnh chính
      document.getElementById("main-image").src = allImages[0];

      // Render list ảnh nhỏ
      const galleryContainer = document.getElementById("gallery-list");
      galleryContainer.innerHTML = allImages
        .map(
          (img, index) => `
                <button onclick="changeMainImage('${img}', this)" 
                    class="gallery-thumb shrink-0 size-16 md:size-20 rounded-lg border-2 ${index === 0 ? "border-primary" : "border-transparent"} p-1 bg-white dark:bg-[#1e2125] cursor-pointer overflow-hidden">
                    <img class="w-full h-full object-contain" src="${img}" />
                </button>
            `,
        )
        .join("");
    }

    // --- XỬ LÝ MÀU SẮC ---
    const colorWrapper = document.getElementById("color-section");
    const colorContainer = document.getElementById("color-options-container");

    // Lọc bỏ các item màu bị null hoặc không có tên
    // Input: [{colorName: null, ...}] -> Filter -> Output: []
    const validColors = (p.colors || []).filter(
      (c) => c.colorName && c.colorName.trim() !== "",
    );

    // Kiểm tra dựa trên danh sách ĐÃ LỌC
    if (validColors.length > 0) {
      // Có màu hợp lệ -> Hiển thị Section
      if (colorWrapper) colorWrapper.classList.remove("hidden");

      // Render danh sách màu (Dùng validColors để render)
      if (colorContainer) {
        colorContainer.innerHTML = validColors
          .map(
            (c, index) => `
                    <label class="group relative cursor-pointer w-20">
                      <input ${index === 0 ? "checked" : ""} class="peer sr-only" name="color-choice" type="radio" value="${c.colorName}" 
                            onchange="document.getElementById('selected-color-name').textContent = '${c.colorName}'">
                      <div class="w-full aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/30 transition-all bg-white dark:bg-[#1e2125] p-1 overflow-hidden">
                        <img alt="${c.colorName}" class="w-full h-full object-contain" src="${c.colorImageUrl || "https://placehold.co/50?text=Color"}" 
                             onerror="this.src='https://placehold.co/50?text=No+Img'"/>
                      </div>
                      <span class="block text-center mt-2 text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-primary peer-checked:text-primary transition-colors line-clamp-1">
                        ${c.colorName}
                      </span>
                    </label>
                `,
          )
          .join("");

        // Set tên màu mặc định (lấy từ validColors)
        const selectedColorNameEl = document.getElementById(
          "selected-color-name",
        );
        if (selectedColorNameEl)
          selectedColorNameEl.innerText = validColors[0].colorName;
      }
    } else {
      // Danh sách sau khi lọc bị rỗng -> Ẩn phần màu sắc
      if (colorWrapper) colorWrapper.classList.add("hidden");
    }

    // --- XỬ LÝ THÔNG SỐ KỸ THUẬT (SPECS) ---
    if (p.specs) {
      // Lấy cấu hình từ Category
      const config = p.categoryConfig || { highlights: [], labels: {} };
      const labels = config.labels || {};
      const highlights = config.highlights || [];

      // Hàm helper 1: Dịch key sang tiếng Việt
      const getLabel = (key) => {
        if (labels[key]) return labels[key];
        return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      };

      // Hàm helper 2: Format giá trị (Chuyển dấu phẩy thành xuống dòng)
      const formatSpecValue = (value) => {
        if (!value || typeof value !== "string") return value;

        // Regex: Tách chuỗi bằng dấu phẩy, TRỪ dấu phẩy trong ngoặc đơn
        const parts = value.split(/,(?![^(]*\))/);

        if (parts.length <= 1) return value;

        return parts
          .map((part) => part.trim()) // Cắt khoảng trắng thừa 2 đầu
          .filter((part) => part) // Bỏ dòng rỗng
          .join("<br>"); // Chỉ nối bằng thẻ xuống dòng
      };

      // RENDER TÓM TẮT
      const summaryContainer = document.getElementById("specs-summary-list");

      // Logic lấy highlights
      let summaryKeys =
        highlights.length > 0 ? highlights : Object.keys(p.specs).slice(0, 5);

      const summaryHtml = summaryKeys
        .map((key) => {
          const value = p.specs[key];
          if (!value) return "";

          return `
                <div class="grid grid-cols-12 gap-4 py-3 px-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span class="col-span-4 text-gray-500 dark:text-gray-400 font-normal">
                        ${getLabel(key)}
                    </span>
                    <span class="col-span-8 font-bold text-[#101818] dark:text-white leading-relaxed">
                        ${formatSpecValue(value)}
                    </span>
                </div>`;
        })
        .join("");

      if (summaryContainer) {
        summaryContainer.innerHTML = summaryHtml;
      }

      // RENDER CHI TIẾT (Modal)
      const detailContainer = document.getElementById("specs-detail-list");
      const allKeys = Object.keys(p.specs);

      // Sắp xếp priority cho highlights
      allKeys.sort((a, b) => {
        const idxA = highlights.indexOf(a);
        const idxB = highlights.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

      if (detailContainer) {
        detailContainer.innerHTML = allKeys
          .map(
            (key) => `
                <div class="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-[#25282c]/50 transition-colors border-b border-gray-50 dark:border-gray-800">
                    <span class="col-span-5 md:col-span-4 text-gray-500 dark:text-gray-400 font-medium">
                        ${getLabel(key)}
                    </span>
                    <span class="col-span-7 md:col-span-8 text-gray-900 dark:text-white font-semibold leading-relaxed">
                        ${formatSpecValue(p.specs[key])}
                    </span>
                </div>
                `,
          )
          .join("");
      }
    }

    // --- GẮN SỰ KIỆN NÚT MUA ---
    document.getElementById("btn-buy-now").onclick = () =>
      addToCart(p.id, true);
    document.getElementById("btn-add-cart").onclick = () =>
      addToCart(p.id, false);
  } catch (error) {
    console.error(error);
    alert("Có lỗi xảy ra khi tải dữ liệu sản phẩm.");
  }
}

// --- UTILS ---

function changeMainImage(src, btn) {
  document.getElementById("main-image").src = src;
  // Highlight active thumb
  document
    .querySelectorAll(".gallery-thumb")
    .forEach((el) =>
      el.classList.replace("border-primary", "border-transparent"),
    );
  btn.classList.replace("border-transparent", "border-primary");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function formatCurrency(val) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
}

function formatKey(key) {
  // Chuyển ram_capacity -> Ram Capacity
  return key.replace(/_/g, " ");
}

// --- THÊM VÀO GIỎ HÀNG ---
async function addToCart(productId, buyNow) {
  // Kiểm tra đăng nhập
  const token = AuthUtils.getToken();
  if (!token) {
    if (
      confirm("Bạn cần đăng nhập để mua hàng. Chuyển đến trang đăng nhập ngay?")
    ) {
      window.location.href = "login.html";
    }
    return;
  }

  // Lấy thông tin Màu sắc (Mapping vào skuId)
  // Tìm input radio màu đang được chọn
  const selectedColorInput = document.querySelector(
    'input[name="color-choice"]:checked',
  );
  const colorName = selectedColorInput ? selectedColorInput.value : null;

  // Kiểm tra validation: Nếu sản phẩm có tùy chọn màu mà người dùng chưa chọn
  const hasColorOptions =
    document.querySelectorAll('input[name="color-choice"]').length > 0;
  if (hasColorOptions && !colorName) {
    alert("Vui lòng chọn màu sắc sản phẩm!");

    // Scroll nhẹ đến phần chọn màu để nhắc người dùng
    const colorSection = document.getElementById("color-section");
    if (colorSection)
      colorSection.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Lấy số lượng từ Input (Nếu có input id="quantity", ngược lại mặc định 1)
  const quantityInput = document.getElementById("quantity");
  let quantity = 1;
  if (quantityInput) {
    quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
  }

  // Xử lý giao diện
  const btnId = buyNow ? "btn-buy-now" : "btn-add-cart";
  const btn = document.getElementById(btnId);
  let originalText = "";

  if (btn) {
    originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...`;
  }

  // Gọi API
  try {
    const payload = {
      productId: parseInt(productId),
      quantity: quantity,
      selectedColor: colorName, // Gửi tên màu vào trường skuId
    };

    const response = await fetch(`${AppConfig.CART_API_URL}/add`, {
      //
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      // Thành công
      if (buyNow) {
        window.location.href = "cart.html";
      } else {
        alert("Đã thêm sản phẩm vào giỏ hàng!");

        // Tự động tải lại số lượng trên Header
        if (typeof HeaderLogic !== "undefined") {
          HeaderLogic.updateCartBadge();
        }
      }
    } else {
      // Xử lý lỗi từ Backend trả về
      const errorText = await response.text();
      console.error("Lỗi thêm giỏ hàng:", errorText);
      alert("Không thể thêm vào giỏ hàng: " + errorText);
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error);
    alert("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
  } finally {
    // Khôi phục trạng thái nút
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

const formatSpecValue = (value) => {
  if (!value || typeof value !== "string") return value;

  // Regex: Tìm dấu phẩy KHÔNG nằm trong ngoặc đơn
  const parts = value.split(/,(?![^(]*\))/);

  if (parts.length <= 1) return value;

  return parts
    .map((part) => part.trim())
    .filter((part) => part)
    .join("<br>");
};

// Biến toàn cục để xử lý phân trang đánh giá
let allReviewsData = [];
let displayedReviewsCount = 0;
const REVIEWS_PER_PAGE = 3; // Mỗi lần bấm xem thêm sẽ hiện 3 đánh giá

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  if (productId) {
    loadProductReviews(productId);
  }
});

// Hàm format thời gian
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + " tuần trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

// Hàm render sao động
const generateStarsHTML = (rating, isSmall = false) => {
  const sizeClass = isSmall ? "text-[14px]" : "text-[24px]";
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      starsHtml += `<span class="material-symbols-outlined ${sizeClass} filled text-yellow-400">star</span>`;
    } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
      starsHtml += `<span class="material-symbols-outlined ${sizeClass} filled text-yellow-400">star_half</span>`;
    } else {
      starsHtml += `<span class="material-symbols-outlined ${sizeClass} text-gray-300">star</span>`;
    }
  }
  return starsHtml;
};

// TẢI VÀ TÍNH TOÁN DỮ LIỆU
async function loadProductReviews(productId) {
  try {
    const response = await fetch(
      `http://localhost:8082/api/products/${productId}/reviews`,
    );
    if (!response.ok) throw new Error("Lỗi tải đánh giá");

    allReviewsData = await response.json();

    if (allReviewsData.length === 0) {
      document.getElementById("review-stats-container").innerHTML = "";
      document.getElementById("reviews-list-container").innerHTML =
        `<p class="text-gray-500 italic text-center py-6">Chưa có đánh giá nào cho sản phẩm này.</p>`;
      return;
    }

    renderReviewStats();

    // Render danh sách
    displayedReviewsCount = 0;
    document.getElementById("reviews-list-container").innerHTML = "";
    loadMoreReviews();
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById("reviews-list-container").innerHTML =
      `<p class="text-red-500 text-center">Không thể tải đánh giá lúc này.</p>`;
  }
}

// RENDER KHỐI THỐNG KÊ
function renderReviewStats() {
  const totalReviews = allReviewsData.length;
  let sumRating = 0;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  allReviewsData.forEach((rev) => {
    sumRating += rev.rating;
    if (starCounts[rev.rating] !== undefined) starCounts[rev.rating]++;
  });

  // Tính điểm trung bình
  const averageRating = (sumRating / totalReviews).toFixed(1);

  // Tính phần trăm từng thanh ngang
  let progressBarsHtml = "";
  for (let i = 5; i >= 1; i--) {
    const percent =
      totalReviews === 0 ? 0 : Math.round((starCounts[i] / totalReviews) * 100);
    progressBarsHtml += `
            <div class="flex items-center gap-3 text-sm">
                <span class="w-8 font-bold text-gray-600 dark:text-gray-300">
                  ${i} <span class="text-xs font-normal">sao</span>
                </span>
                <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-primary" style="width: ${percent}%"></div>
                </div>
                <span class="w-8 text-right text-gray-400">${percent}%</span>
            </div>
        `;
  }

  // Đổ HTML vào khối thống kê
  document.getElementById("review-stats-container").innerHTML = `
        <div class="md:col-span-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#25282c] rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
            <div class="text-5xl font-black text-[#101818] dark:text-white mb-2">
                ${averageRating}<span class="text-2xl text-gray-400 font-medium">/5</span>
            </div>
            <div class="flex items-center gap-1 mb-2">
                ${generateStarsHTML(averageRating, false)}
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
                ${totalReviews} đánh giá
            </p>
        </div>
        <div class="md:col-span-2 flex flex-col justify-center gap-3">
            ${progressBarsHtml}
        </div>
    `;
}

// RENDER DANH SÁCH & NÚT XEM THÊM
function loadMoreReviews() {
  const listContainer = document.getElementById("reviews-list-container");
  const loadMoreContainer = document.getElementById("load-more-container");
  const btnLoadMore = document.getElementById("btn-load-more");

  const nextCount = Math.min(
    displayedReviewsCount + REVIEWS_PER_PAGE,
    allReviewsData.length,
  );
  const reviewsToRender = allReviewsData.slice(
    displayedReviewsCount,
    nextCount,
  );

  const colors = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-primary/10 text-primary",
    "bg-pink-100 text-pink-600",
    "bg-purple-100 text-purple-600",
  ];

  reviewsToRender.forEach((review, index) => {
    const initials =
      typeof UIUtils !== "undefined"
        ? UIUtils.getInitials(review.reviewerName || "Khách hàng")
        : "KH";

    const defaultAvatarClass =
      "bg-gradient-to-br from-primary to-[#009999] text-white shadow-sm ring-2 ring-gray-50 dark:ring-gray-800";

    const reviewHtml = `
            <div class="border-b border-gray-100 dark:border-gray-800 pb-6">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-3">
                        
                        <div class="size-10 rounded-full ${review.reviewerAvatar ? "p-0" : defaultAvatarClass} flex items-center justify-center font-bold text-[15px] overflow-hidden shrink-0">
                            ${
                              review.reviewerAvatar
                                ? `<img src="${review.reviewerAvatar}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                   <span style="display:none">${initials}</span>`
                                : `<span class="tracking-wide">${initials}</span>`
                            }
                        </div>

                        <div class="flex flex-col">
                            <span class="font-bold text-[#101818] dark:text-white text-sm">${review.reviewerName || "Khách hàng"}</span>
                            <div class="flex items-center gap-1 mt-0.5">
                                ${generateStarsHTML(review.rating, true)}
                            </div>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400 shrink-0">${timeAgo(review.createdAt)}</span>
                </div>
                <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed pl-[52px]">
                    ${review.comment}
                </p>
            </div>
        `;
    listContainer.insertAdjacentHTML("beforeend", reviewHtml);
  });

  displayedReviewsCount = nextCount;

  // Xử lý hiện/ẩn nút Xem thêm
  const remaining = allReviewsData.length - displayedReviewsCount;
  if (remaining > 0) {
    loadMoreContainer.classList.remove("hidden");
    btnLoadMore.innerText = `Xem thêm ${remaining} đánh giá`;
    btnLoadMore.onclick = loadMoreReviews; // Gắn sự kiện click
  } else {
    loadMoreContainer.classList.add("hidden");
  }
}
