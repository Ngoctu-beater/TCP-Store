document.addEventListener("DOMContentLoaded", () => {
  let currentSlide = 0;
  const slider = document.getElementById("hero-slider");
  const dots = document.querySelectorAll(".slider-dot");
  const totalSlides = 3;

  window.nextSlide = function () {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
  };

  window.prevSlide = function () {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlider();
  };

  window.goToSlide = function (index) {
    currentSlide = index;
    updateSlider();
  };

  function updateSlider() {
    if (!slider) return;
    // Dịch chuyển khối slider
    slider.style.transform = `translateX(-${(currentSlide * 100) / totalSlides}%)`;

    // Cập nhật trạng thái các nút chấm tròn (Dots)
    dots.forEach((dot, index) => {
      if (index === currentSlide) {
        dot.classList.add("bg-primary");
        dot.classList.remove("bg-white/50");
      } else {
        dot.classList.remove("bg-primary");
        dot.classList.add("bg-white/50");
      }
    });
  }

  // Tự động chuyển slide sau mỗi 5 giây
  setInterval(nextSlide, 5000);

  loadFeaturedCategories();
  loadFeaturedProducts();
  loadTopSellingProducts();
});

function createProductCard(product) {
    const defaultImg = "https://via.placeholder.com/300";
    const imgUrl = product.thumbnail || defaultImg;
    const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.basePrice;

    return `
    <div class="group relative flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-xl transition-all duration-300">
        <div class="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50">
            <img
                class="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                src="${imgUrl}"
                alt="${product.name}"
            />
            <div class="absolute right-3 top-3 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
                <button class="size-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-lg">favorite</span>
                </button>
                <button class="size-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-lg">visibility</span>
                </button>
            </div>
        </div>
        <div class="flex flex-col gap-2 px-1">
            <h3 class="font-bold text-lg line-clamp-2 hover:text-primary cursor-pointer transition-colors leading-snug">
                <a href="product_detail.html?id=${product.id}">${product.name}</a>
            </h3>
            <div class="flex items-center justify-between">
                <span class="text-primary font-bold text-xl">${UIUtils.formatCurrency(price)}</span>
            </div>
            <div class="flex items-center gap-2 mt-1">
                <span class="flex h-2 w-2 rounded-full bg-green-500"></span>
                <span class="text-xs font-semibold text-green-600">Còn hàng</span>
            </div>
            <button onclick="addToCart(${product.id})" class="mt-2 w-full rounded-lg bg-gray-50 text-gray-900 py-2.5 text-sm font-bold hover:bg-primary hover:text-white transition-all">
                Thêm vào giỏ
            </button>
        </div>
    </div>
    `;
}

// Sản Phẩm Nổi Bật
async function loadFeaturedProducts() {
    const container = document.getElementById("featured-products");
    if (!container) return;

    try {
        const response = await fetch(`${AppConfig.PRODUCT_API_URL}/products/featured`);
        if (response.ok) {
            const products = await response.json();
            container.innerHTML = products.map(createProductCard).join("");
        } else {
            container.innerHTML = '<p class="text-gray-500 py-8">Chưa có sản phẩm nổi bật nào.</p>';
        }
    } catch (error) {
        console.error("Lỗi tải sản phẩm nổi bật:", error);
        container.innerHTML = '<p class="text-red-500 py-8">Không thể kết nối đến máy chủ.</p>';
    }
}

// Sản Phẩm Bán Chạy Nhất
async function loadTopSellingProducts() {
    const container = document.getElementById("best-selling-products");
    if (!container) return;

    try {
        const response = await fetch(`${AppConfig.PRODUCT_API_URL}/products/top-selling`);
        if (response.ok) {
            const products = await response.json();
            container.innerHTML = products.map(createProductCard).join("");
        } else {
            container.innerHTML = '<p class="text-gray-500 py-8">Chưa có sản phẩm bán chạy nào.</p>';
        }
    } catch (error) {
        console.error("Lỗi tải sản phẩm bán chạy:", error);
        container.innerHTML = '<p class="text-red-500 py-8">Không thể kết nối đến máy chủ.</p>';
    }
}

function getCategoryStyle(name) {
    const n = name.toLowerCase();
    if (n.includes("laptop")) return { icon: "laptop_mac", bgClass: "bg-blue-50", textClass: "text-blue-500" };
    if (n.includes("điện thoại") || n.includes("phone") || n.includes("smartphone")) {
        return { icon: "smartphone", bgClass: "bg-teal-50", textClass: "text-teal-500" };
    }
    if (n.includes("tivi") || n.includes("tv")) {
        return { icon: "tv", bgClass: "bg-indigo-50", textClass: "text-indigo-500" };
    }
    if (n.includes("đồng hồ") || n.includes("watch")) {
        return { icon: "watch", bgClass: "bg-rose-50", textClass: "text-rose-500" };
    }
    
    // Mặc định
    return { icon: "grid_view", bgClass: "bg-gray-100", textClass: "text-gray-500" };
}

// Hàm gọi API lấy Danh Mục Nổi Bật
async function loadFeaturedCategories() {
    const container = document.getElementById("featured-categories");
    if (!container) return;

    try {
        const response = await fetch(`${AppConfig.PRODUCT_API_URL}/categories/featured`);
        
        if (response.ok) {
            const categories = await response.json();
            
            container.innerHTML = categories.map(cat => {
                const style = getCategoryStyle(cat.name);
                
                return `
                <a href="products.html?category=${cat.id}" class="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md transition-all group">
                    <div class="w-16 h-16 rounded-full ${style.bgClass} flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                        <span class="material-symbols-outlined text-3xl ${style.textClass} group-hover:text-primary">${style.icon}</span>
                    </div>
                    <span class="font-bold text-gray-800 text-sm text-center">${cat.name}</span>
                </a>
                `;
            }).join("");
        }
    } catch (error) {
        console.error("Lỗi tải danh mục:", error);
    }
}