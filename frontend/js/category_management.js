document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  const searchInput = document.getElementById("search-category");
  if (searchInput) {
    // Sự kiện 'input' giúp tìm kiếm real-time ngay khi người dùng đang gõ
    searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.trim().toLowerCase();

      // Nếu ô tìm kiếm rỗng, hiển thị lại toàn bộ
      if (!keyword) {
        renderTable(categoriesData);
        return;
      }

      // Lọc danh sách: tìm theo tên danh mục HOẶC tên danh mục cha
      const filteredCategories = categoriesData.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          (c.parentName && c.parentName.toLowerCase().includes(keyword)),
      );

      // Gọi lại hàm render để vẽ lại bảng với dữ liệu đã lọc
      renderTable(filteredCategories);
    });
  }
});

let categoriesData = [];

// TẢI DANH SÁCH DANH MỤC
async function loadCategories() {
  const tbody = document.getElementById("category-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải...</td></tr>`;

  try {
    // GỌI SANG PRODUCT SERVICE
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/all`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (!res.ok) throw new Error("Lỗi tải dữ liệu");

    categoriesData = await res.json();
    renderTable(categoriesData);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// RENDER BẢNG
function renderTable(categories) {
  const tbody = document.getElementById("category-table-body");

  const infoText = document.querySelector(".p-4.border-t span.text-sm");
  if (infoText) infoText.innerText = `Tổng cộng: ${categories.length} danh mục`;

  if (categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">Chưa có danh mục nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = categories
    .map((c) => {
      const statusHtml = c.isFeatured
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                 <span class="material-symbols-outlined text-[14px] filled">star</span> Nổi bật
               </span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                 <span class="size-1.5 rounded-full bg-gray-500"></span> Bình thường
               </span>`;

      return `
        <tr class="hover:bg-[#f9fafb] transition-colors group">
            <td class="py-4 px-6">
                <p class="text-sm font-bold text-[#111417] text-center">
                    ${c.parentName ? `<span class="text-[#637588] font-normal">${c.parentName} &rsaquo; </span>` : ""}${c.name}
                </p>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-full bg-blue-50 text-primary text-xs font-bold">
                    ${c.productCount || 0}
                </span>
            </td>
            <td class="py-4 px-6 text-center">${statusHtml}</td>
            <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openCategoryModal(${c.id})" class="size-8 flex items-center justify-center rounded hover:bg-blue-50 text-[#637588] hover:text-primary transition-colors" title="Sửa">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onclick="deleteCategory(${c.id})" class="size-8 flex items-center justify-center rounded hover:bg-red-50 text-[#637588] hover:text-red-600 transition-colors" title="Xóa">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

function openCategoryModal(id = null) {
  document.getElementById("category-modal").classList.remove("hidden");
  const isEdit = id !== null;
  document.getElementById("modal-title").innerText = isEdit
    ? "Sửa danh mục"
    : "Thêm danh mục mới";

  // Đổ danh sách danh mục cha
  const parentSelect = document.getElementById("modal-cat-parent");
  parentSelect.innerHTML =
    '<option value="">----</option>';
  categoriesData.forEach((c) => {
    if (c.id !== id) {
      parentSelect.innerHTML += `<option value="${c.id}">${c.parentName ? c.parentName + " > " : ""}${c.name}</option>`;
    }
  });

  if (isEdit) {
    const cat = categoriesData.find((c) => c.id === id);
    document.getElementById("modal-cat-id").value = cat.id;
    document.getElementById("modal-cat-name").value = cat.name;
    document.getElementById("modal-cat-featured").checked = cat.isFeatured;
    document.getElementById("modal-cat-parent").value = cat.parentId || "";
  } else {
    document.getElementById("modal-cat-id").value = "";
    document.getElementById("modal-cat-name").value = "";
    document.getElementById("modal-cat-featured").checked = true;
    document.getElementById("modal-cat-parent").value = "";
  }
}

function closeCategoryModal() {
  document.getElementById("category-modal").classList.add("hidden");
}

async function saveCategory() {
  const id = document.getElementById("modal-cat-id").value;
  const name = document.getElementById("modal-cat-name").value.trim();
  const isFeatured = document.getElementById("modal-cat-featured").checked;
  const parentId = document.getElementById("modal-cat-parent").value;

  if (!name) {
    alert("Vui lòng nhập tên danh mục!");
    return;
  }

  // Dữ liệu gửi đi cực kỳ tối giản
  const payload = {
    name: name,
    isFeatured: isFeatured,
    displayConfig: null, // Truyền null vì không còn dùng tới
    parentId: parentId ? parseInt(parentId) : null,
  };

  const method = id ? "PUT" : "POST";
  const url = id
    ? `${AppConfig.PRODUCT_API_URL}/categories/admin/${id}`
    : `${AppConfig.PRODUCT_API_URL}/categories/admin`;

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
      closeCategoryModal();
      loadCategories();
    } else {
      alert("Lỗi: " + (await res.text()));
    }
  } catch (e) {
    alert("Lỗi hệ thống!");
  }
}

async function deleteCategory(id) {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm bên trong có thể bị ảnh hưởng!",
    )
  )
    return;

  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (res.ok) {
      alert("Đã xóa danh mục!");
      loadCategories();
    } else alert("Không thể xóa danh mục này!");
  } catch (e) {
    alert("Lỗi hệ thống!");
  }
}
