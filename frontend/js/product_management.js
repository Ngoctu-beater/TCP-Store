let currentPage = 0;
const pageSize = 10;
let currentSearch = "";
let currentCategory = "";
let currentStatus = "";

document.addEventListener("DOMContentLoaded", () => {
  loadCategoriesForFilter();
  loadProducts();

  // Lắng nghe tìm kiếm
  const searchInput = document.getElementById("search-product");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0;
        loadProducts();
      }
    });
  }

  // Lắng nghe bộ lọc Danh mục
  const catFilter = document.getElementById("filter-category");
  if (catFilter) {
    catFilter.addEventListener("change", (e) => {
      currentCategory = e.target.value;
      currentPage = 0;
      loadProducts();
    });
  }

  // Lắng nghe bộ lọc Trạng thái
  const statusFilter = document.getElementById("filter-status");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatus = e.target.value;
      currentPage = 0;
      loadProducts();
    });
  }
});

// Tải danh mục vào thẻ Select
async function loadCategoriesForFilter() {
  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/all`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (res.ok) {
      const categories = await res.json();
      const select = document.getElementById("filter-category");
      categories.forEach((c) => {
        select.innerHTML += `<option value="${c.id}">${c.parentName ? c.parentName + " > " : ""}${c.name}</option>`;
      });
    }
  } catch (e) {
    console.error("Lỗi tải danh mục:", e);
  }
}

// Gọi API lấy sản phẩm
async function loadProducts() {
  const tbody = document.getElementById("product-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải...</td></tr>`;

  try {
    const url = `${AppConfig.PRODUCT_API_URL}/products/admin/all?keyword=${encodeURIComponent(currentSearch)}&categoryId=${currentCategory}&status=${currentStatus}&page=${currentPage}&size=${pageSize}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi máy chủ");
    const data = await response.json();

    renderTable(data.content);
    renderPagination(data);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// Render bảng sản phẩm
function renderTable(products) {
  const tbody = document.getElementById("product-table-body");

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Không tìm thấy sản phẩm nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map((p) => {
      let statusHtml = "";
      if (p.stockStatus === "IN_STOCK") {
        statusHtml = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Còn hàng</span>`;
      } else if (p.stockStatus === "OUT_OF_STOCK") {
        statusHtml = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Hết hàng</span>`;
      } else {
        statusHtml = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Đặt trước</span>`;
      }

      // Nếu database lưu null hoặc true thì mặc định coi là đang hiện
      const isShowing = p.isActive !== false;
      const activeHtml = isShowing
        ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-primary bg-blue-50 border border-blue-100">Đang hiện</span>`
        : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200">Đang ẩn</span>`;

      return `
        <tr class="hover:bg-[#f9fafb] transition-colors group">
            <td class="py-4 px-6">
                <div class="size-12 rounded-lg bg-[#f0f2f4] flex-shrink-0 bg-cover bg-center border border-[#e5e7eb]" style="background-image: url('${p.thumbnail || "https://via.placeholder.com/150"}')"></div>
            </td>
            <td class="py-4 px-6">
                <a class="text-[#111417] font-bold text-sm hover:text-primary hover:underline transition-colors block max-w-[240px] truncate" href="#">${p.name}</a>
                <span class="text-xs text-[#637588]">SKU: ${p.sku}</span>
            </td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center">${p.categoryName}</td>
            <td class="py-4 px-6 text-sm font-bold text-[#111417] text-center">${UIUtils.formatCurrency(p.salePrice)}</td>
            <td class="py-4 px-6 text-sm text-[#111417] text-center font-bold text-center">${p.stock}</td>
            <td class="py-4 px-6 text-center">${statusHtml}</td>
            
            <td class="py-4 px-6 text-center">${activeHtml}</td>
            
            <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="openProductModal(${p.id})" class="size-8 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Sửa">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="deleteProduct(${p.id})" class="size-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

function renderPagination(pageData) {
  const info = document.getElementById("pagination-info");
  if (info) {
    // Tính toán vị trí bắt đầu: (pageNo * pageSize) + 1
    const start = pageData.pageNo * pageData.pageSize + 1;
    const end = Math.min(start + pageData.pageSize - 1, pageData.totalElements);

    info.innerHTML =
      pageData.totalElements === 0
        ? `Không có dữ liệu`
        : `Hiển thị <span class="font-bold text-[#111417]">${start}-${end}</span> trong số <span class="font-bold text-[#111417]">${pageData.totalElements}</span> sản phẩm`;
  }

  document.getElementById("btn-prev-page").disabled = pageData.pageNo === 0;
  document.getElementById("btn-next-page").disabled = pageData.last;

  const pageNumEl = document.getElementById("current-page-number");
  if (pageNumEl) pageNumEl.innerText = pageData.pageNo + 1;
}

function changePage(dir) {
  currentPage += dir;
  loadProducts();
}

// ==========================================
// LOGIC THÊM / SỬA / XÓA SẢN PHẨM
// ==========================================

async function openProductModal(id = null) {
  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-form").reset();
  document.getElementById("modal-product-id").value = id || "";
  document.getElementById("modal-product-title").innerText = id
    ? "Cập nhật sản phẩm"
    : "Thêm sản phẩm mới";

  // Copy danh sách danh mục từ ô Lọc vào Form
  const filterCat = document.getElementById("filter-category");
  const modalCat = document.getElementById("modal-product-category");
  modalCat.innerHTML = Array.from(filterCat.options)
    .filter((opt) => opt.value !== "")
    .map((opt) => `<option value="${opt.value}">${opt.innerText}</option>`)
    .join("");

  // Nếu là chế độ Sửa -> Lấy chi tiết sản phẩm để đổ vào form
  if (id) {
    try {
      const res = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`);
      if (res.ok) {
        const product = await res.json();
        document.getElementById("modal-product-name").value = product.name;
        document.getElementById("modal-product-sku").value = product.sku;
        document.getElementById("modal-product-category").value =
          product.categoryId;
        document.getElementById("modal-product-base-price").value =
          product.basePrice || 0;
        document.getElementById("modal-product-sale-price").value =
          product.salePrice || 0;
        document.getElementById("modal-product-stock").value =
          product.stock || 0;
        document.getElementById("modal-product-stock-status").value =
          product.stockStatus;
        document.getElementById("modal-product-is-active").value =
          product.isActive !== false ? "true" : "false";
        document.getElementById("modal-product-thumbnail").value =
          product.thumbnail || "";
      }
    } catch (e) {
      console.error("Lỗi lấy chi tiết:", e);
    }
  }
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

async function saveProduct() {
  // Lấy dữ liệu từ form
  const id = document.getElementById("modal-product-id").value;
  const requestData = {
    name: document.getElementById("modal-product-name").value.trim(),
    sku: document.getElementById("modal-product-sku").value.trim(),
    categoryId: parseInt(
      document.getElementById("modal-product-category").value,
    ),
    basePrice: parseFloat(
      document.getElementById("modal-product-base-price").value || 0,
    ),
    salePrice: parseFloat(
      document.getElementById("modal-product-sale-price").value || 0,
    ),
    stock: parseInt(document.getElementById("modal-product-stock").value || 0),
    stockStatus: document.getElementById("modal-product-stock-status").value,
    isActive:
      document.getElementById("modal-product-is-active").value === "true",
    thumbnail: document.getElementById("modal-product-thumbnail").value.trim(),
  };

  // Validate cơ bản
  if (!requestData.name || !requestData.sku || !requestData.categoryId) {
    alert("Vui lòng nhập đầy đủ các trường bắt buộc (*)");
    return;
  }

  const btn = document.getElementById("btn-save-product");
  UIUtils.setLoading(btn, true, "Đang lưu...");

  // Gọi API
  try {
    const url = id
      ? `${AppConfig.PRODUCT_API_URL}/products/admin/${id}`
      : `${AppConfig.PRODUCT_API_URL}/products/admin`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      alert(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
      closeProductModal();
      loadProducts();
    } else {
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu sản phẩm");
  }
}

async function deleteProduct(id) {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa sản phẩm này vĩnh viễn? (Có thể đổi Trạng thái sang Tạm ẩn thay vì Xóa)",
    )
  )
    return;

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/admin/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (response.ok) {
      alert("Đã xóa sản phẩm!");
      loadProducts();
    } else {
      const err = await response.text();
      alert("Không thể xóa: " + err);
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ");
  }
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Xử lý khi chọn ảnh Thumbnail
document
  .getElementById("upload-thumbnail")
  ?.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (file) {
      const base64 = await fileToBase64(file);
      document.getElementById("modal-product-thumbnail-base64").value = base64;
      const preview = document.getElementById("preview-thumbnail");
      preview.src = base64;
      preview.classList.remove("hidden");
    }
  });

// ==========================================
// ẢNH CHI TIẾT & MÀU SẮC
// ==========================================
function addDetailImageRow(existingUrl = "") {
  const container = document.getElementById("detail-images-container");
  const rowId = Date.now() + Math.random();
  const div = document.createElement("div");
  div.className =
    "flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-100 detail-img-row";
  div.innerHTML = `
        <input type="file" accept="image/*" class="text-xs w-full" onchange="previewDetailRow(this, '${rowId}')">
        <input type="hidden" class="detail-img-data" value="${existingUrl}">
        <img id="preview-img-${rowId}" src="${existingUrl}" class="w-8 h-8 object-cover rounded border ${existingUrl ? "" : "hidden"}">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:bg-red-50 p-1 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
    `;
  container.appendChild(div);
}

async function previewDetailRow(inputEl, rowId) {
  if (inputEl.files[0]) {
    const base64 = await fileToBase64(inputEl.files[0]);
    inputEl.nextElementSibling.value = base64;
    const img = document.getElementById(`preview-img-${rowId}`);
    img.src = base64;
    img.classList.remove("hidden");
  }
}

function addColorRow(name = "", imgUrl = "") {
  const container = document.getElementById("colors-container");
  const rowId = Date.now() + Math.random();
  const div = document.createElement("div");
  div.className =
    "bg-gray-50 p-3 rounded border border-gray-100 color-row flex flex-col gap-2";
  div.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <input type="text" placeholder="Tên màu (VD: Đen Titan)" class="color-name w-full h-8 px-2 text-sm border rounded focus:border-green-500 focus:ring-green-500" value="${name}">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:bg-red-50 p-1 rounded"><span class="material-symbols-outlined text-[18px]">close</span></button>
        </div>
        <div class="flex items-center gap-2">
            <input type="file" accept="image/*" class="text-xs w-full" onchange="previewDetailRow(this, '${rowId}')">
            <input type="hidden" class="color-img-data" value="${imgUrl}">
            <img id="preview-img-${rowId}" src="${imgUrl}" class="w-8 h-8 object-cover rounded border ${imgUrl ? "" : "hidden"}">
        </div>
    `;
  container.appendChild(div);
}

// ==========================================
// THÔNG SỐ KỸ THUẬT
// ==========================================
let allCategoriesAdmin = []; // Biến toàn cục lưu cache danh mục

async function loadCategoriesForFilter() {
  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/all`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (res.ok) {
      allCategoriesAdmin = await res.json();
      const selectFilter = document.getElementById("filter-category");
      const selectModal = document.getElementById("modal-product-category");

      let htmlOptions = "";
      allCategoriesAdmin.forEach((c) => {
        htmlOptions += `<option value="${c.id}">${c.parentName ? c.parentName + " > " : ""}${c.name}</option>`;
      });

      selectFilter.innerHTML += htmlOptions;
      selectModal.innerHTML =
        `<option value="">-- Chọn danh mục --</option>` + htmlOptions;
    }
  } catch (e) {
    console.error("Lỗi tải danh mục:", e);
  }
}

function handleCategoryChange(existingSpecs = null) {
  const catId = parseInt(
    document.getElementById("modal-product-category").value,
  );
  const container = document.getElementById("dynamic-specs-container");
  const guide = document.getElementById("specs-guide");
  container.innerHTML = "";

  if (!catId) {
    guide.style.display = "block";
    return;
  }
  guide.style.display = "none";

  // Tìm Danh mục hiện tại đang chọn
  let cat = allCategoriesAdmin.find((c) => c.id === catId);
  let configJsonString = cat?.displayConfig;

  // Nếu danh mục con không có cấu hình, tự động lấy của danh mục cha
  if (!configJsonString && cat?.parentId) {
    let parentCat = allCategoriesAdmin.find((c) => c.id === cat.parentId);
    configJsonString = parentCat?.displayConfig;
  }

  if (!configJsonString) {
    container.innerHTML = `<p class="text-sm text-orange-500 italic col-span-2">Danh mục này chưa được định nghĩa cấu trúc thông số kỹ thuật.</p>`;
    return;
  }

  // PARSE JSON VÀ VẼ GIAO DIỆN
  try {
    const config = JSON.parse(configJsonString);

    // Trích xuất phần "labels" từ JSON (Ví dụ: "os": "Hệ điều hành")
    const labels = config.labels;

    if (labels) {
      Object.keys(labels).forEach((key) => {
        const viName = labels[key]; // Tên tiếng Việt (Hệ điều hành, Loại CPU...)
        const value = existingSpecs ? existingSpecs[key] || "" : ""; // Lấy lại dữ liệu cũ nếu đang bấm Sửa

        // Vẽ ô Input: Label hiển thị tiếng Việt, nhưng attribute data-spec-key lưu tiếng Anh (os, cpu...)
        container.innerHTML += `
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">${viName}</label>
                        <input type="text" data-spec-key="${key}" value="${value}" placeholder="Nhập ${viName.toLowerCase()}..." class="spec-input w-full h-9 px-3 rounded border border-gray-300 focus:ring-purple-500 focus:border-purple-500 text-sm">
                    </div>
                `;
      });
    }
  } catch (e) {
    console.error("Lỗi parse config JSON", e);
    container.innerHTML = `<p class="text-sm text-red-500 italic col-span-2">Cấu hình JSON của danh mục bị lỗi định dạng!</p>`;
  }
}

// ==========================================
// MỞ MODAL & LƯU SẢN PHẨM
// ==========================================
async function openProductModal(id = null) {
  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-form").reset();
  document.getElementById("modal-product-id").value = id || "";
  document.getElementById("modal-product-title").innerText = id
    ? "Cập nhật sản phẩm"
    : "Thêm sản phẩm mới";

  // Reset Data động
  document.getElementById("preview-thumbnail").classList.add("hidden");
  document.getElementById("modal-product-thumbnail-base64").value = "";
  document.getElementById("detail-images-container").innerHTML = "";
  document.getElementById("colors-container").innerHTML = "";
  document.getElementById("dynamic-specs-container").innerHTML = "";
  document.getElementById("specs-guide").style.display = "block";

  if (id) {
    try {
      const res = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`);
      if (res.ok) {
        const product = await res.json();
        document.getElementById("modal-product-name").value = product.name;
        document.getElementById("modal-product-sku").value = product.sku;
        document.getElementById("modal-product-category").value =
          product.categoryId;
        document.getElementById("modal-product-featured").checked =
          product.isFeatured || false;
        document.getElementById("modal-product-cost-price").value =
          product.costPrice || 0;
        document.getElementById("modal-product-base-price").value =
          product.basePrice || 0;
        document.getElementById("modal-product-sale-price").value =
          product.salePrice || 0;
        document.getElementById("modal-product-stock").value =
          product.stock || 0;
        document.getElementById("modal-product-stock-status").value =
          product.stockStatus;
        document.getElementById("modal-product-is-active").value =
          product.isActive !== false ? "true" : "false";

        // Render Ảnh chính
        if (product.thumbnail) {
          document.getElementById("modal-product-thumbnail-base64").value =
            product.thumbnail;
          document.getElementById("preview-thumbnail").src = product.thumbnail;
          document
            .getElementById("preview-thumbnail")
            .classList.remove("hidden");
        }

        // Render List Ảnh phụ
        if (product.images)
          product.images.forEach((img) => addDetailImageRow(img));

        // Render List Màu
        if (product.colors)
          product.colors.forEach((c) =>
            addColorRow(c.colorName, c.colorImageUrl),
          );

        // Kích hoạt render Form Specs và đổ data cũ vào
        handleCategoryChange(product.specs);
      }
    } catch (e) {
      console.error("Lỗi lấy chi tiết:", e);
    }
  }
}

async function saveProduct() {
  const id = document.getElementById("modal-product-id").value;

  // Gom Data Ảnh phụ
  const detailImages = [];
  document.querySelectorAll(".detail-img-data").forEach((input) => {
    if (input.value) detailImages.push(input.value);
  });

  // Gom Data Màu sắc
  const colors = [];
  document.querySelectorAll(".color-row").forEach((row) => {
    const name = row.querySelector(".color-name").value.trim();
    const img = row.querySelector(".color-img-data").value;
    if (name) colors.push({ colorName: name, colorImageUrl: img });
  });

  // Gom Data Specs
  const specs = {};
  document.querySelectorAll(".spec-input").forEach((input) => {
    if (input.value.trim() !== "") {
      specs[input.dataset.specKey] = input.value.trim();
    }
  });

  // Build Request Payload
  const requestData = {
    name: document.getElementById("modal-product-name").value.trim(),
    sku: document.getElementById("modal-product-sku").value.trim(),
    categoryId: parseInt(
      document.getElementById("modal-product-category").value,
    ),
    isFeatured: document.getElementById("modal-product-featured").checked,

    costPrice: parseFloat(
      document.getElementById("modal-product-cost-price").value || 0,
    ),
    basePrice: parseFloat(
      document.getElementById("modal-product-base-price").value || 0,
    ),
    salePrice: parseFloat(
      document.getElementById("modal-product-sale-price").value || 0,
    ),

    stock: parseInt(document.getElementById("modal-product-stock").value || 0),
    stockStatus: document.getElementById("modal-product-stock-status").value,
    isActive:
      document.getElementById("modal-product-is-active").value === "true",
    thumbnail: document.getElementById("modal-product-thumbnail-base64").value,
    images: detailImages,
    colors: colors,
    specs: specs,
  };

  if (!requestData.name || !requestData.sku || !requestData.categoryId) {
    alert("Vui lòng nhập đầy đủ Tên, SKU và chọn Danh mục!");
    return;
  }

  const btn = document.getElementById("btn-save-product");
  UIUtils.setLoading(btn, true, "Đang lưu...");

  try {
    const url = id
      ? `${AppConfig.PRODUCT_API_URL}/products/admin/${id}`
      : `${AppConfig.PRODUCT_API_URL}/products/admin`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      alert(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
      closeProductModal();
      loadProducts();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu sản phẩm");
  }
}
