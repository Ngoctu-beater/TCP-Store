// CẤU HÌNH LOGIC SO SÁNH SẢN PHẨM
const COMPARE_KEY = 'tcp_compare_list';
const MAX_COMPARE_ITEMS = 3;
let isCompareCollapsed = false;

// Hàm format tiền
const formatCurrencyCompare = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

// Khởi tạo giao diện khi load xong trang
document.addEventListener('DOMContentLoaded', () => {
    renderCompareModal();
});

// Lấy danh sách từ Local Storage
function getCompareList() {
    return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
}

// THÊM / XÓA SẢN PHẨM VÀO SO SÁNH
function addToCompare(id, name, thumbnail) {
    let list = getCompareList();
    
    // Kiểm tra trùng lặp
    if (list.find(p => p.id === id)) {
        alert('Sản phẩm này đã có trong danh sách so sánh!');
        return;
    }
    
    // Kiểm tra giới hạn tối đa
    if (list.length >= MAX_COMPARE_ITEMS) {
        alert(`Bạn chỉ có thể so sánh tối đa ${MAX_COMPARE_ITEMS} sản phẩm cùng lúc!`);
        return;
    }
    
    list.push({ id, name, thumbnail});
    localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
    
    isCompareCollapsed = false;
    // Nếu thêm thành công, update lại giao diện
    renderCompareModal();
}

// Ẩn thanh to, bật bong bóng
function collapseCompare() {
    isCompareCollapsed = true;
    renderCompareModal();
}

// Bật thanh to, ẩn bong bóng
function expandCompare() {
    isCompareCollapsed = false;
    renderCompareModal();
}

function removeFromCompare(id) {
    let list = getCompareList();
    list = list.filter(p => p.id !== id);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
    renderCompareModal();
}

function clearCompare() {
    localStorage.removeItem(COMPARE_KEY);
    renderCompareModal();
}

// RENDER GIAO DIỆN THANH MODAL
function renderCompareModal() {
    const list = getCompareList();
    const modal = document.getElementById('compare-bottom-modal');
    const bubble = document.getElementById('compare-floating-bubble');
    const bubbleCount = document.getElementById('compare-bubble-count');

    if (!modal) return;

    // TRƯỜNG HỢP 1: Modal rỗng -> Xóa sạch khỏi màn hình
    if (list.length === 0) {
        modal.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
        if (bubble) bubble.classList.add('hidden');
        isCompareCollapsed = false; // Reset trạng thái
        return;
    }

    // TRƯỜNG HỢP 2: Khách bấm "Thu Gọn" -> Ẩn Modal To, Bật Bong Bóng
    if (isCompareCollapsed) {
        modal.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
        
        if (bubble) {
            bubbleCount.innerText = list.length;
            setTimeout(() => bubble.classList.remove('hidden'), 300);
        }
    }

    // TRƯỜNG HỢP 3: Đang Mở Rộng -> Bật Modal To, Ẩn Bong Bóng
    else {
        if (bubble) bubble.classList.add('hidden');
        
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('translate-y-full'), 10);
        
        // Render nội dung bên trong như bình thường
        const slotsContainer = document.getElementById('compare-slots-container');
        slotsContainer.innerHTML = '';
        
        for (let i = 0; i < MAX_COMPARE_ITEMS; i++) {
            if (i < list.length) {
                const p = list[i];
                slotsContainer.innerHTML += `
                    <div class="relative flex-1 min-w-[90px] max-w-[150px] h-full bg-white rounded-lg p-2 border border-gray-100 flex flex-col items-center justify-between shadow-sm group">
                        <button onclick="removeFromCompare(${p.id})" class="absolute -top-0 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg hover:bg-red-600 hover:scale-110 transition-transform">
                            <span class="material-symbols-outlined text-[14px]">close</span>
                        </button>
                        <img src="${p.thumbnail}" class="h-10 md:h-12 w-auto object-contain mb-1 mix-blend-multiply">
                        <div class="w-full text-center">
                            <p class="text-[9px] md:text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight mb-0.5">${p.name}</p>
                        </div>
                    </div>
                `;
            } else {
                slotsContainer.innerHTML += `
                    <button onclick="openCompareSearch()" class="flex-1 min-w-[90px] max-w-[150px] h-full bg-[#f8fcfc] border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-blue-50 transition-colors cursor-pointer">
                        <span class="material-symbols-outlined text-2xl">add</span>
                        <span class="text-[10px] md:text-xs font-bold mt-1">Thêm SP</span>
                    </button>
                `;
            }
        }

        // Check bật/tắt nút So Sánh Ngay
        const compareBtn = document.getElementById('btn-go-compare');
        if (list.length >= 2) {
            compareBtn.disabled = false;
            compareBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            compareBtn.classList.add('bg-primary', 'text-white', 'hover:bg-blue-600');
        } else {
            compareBtn.disabled = true;
            compareBtn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            compareBtn.classList.remove('bg-primary', 'text-white', 'hover:bg-blue-600');
        }
    }
}

// Chuyển hướng sang trang Chi tiết so sánh
function goToCompare() {
    const list = getCompareList();
    if (list.length >= 2) {
        const ids = list.map(p => p.id).join(',');
        window.location.href = `compare.html?ids=${ids}`;
    } else {
        alert('Vui lòng chọn ít nhất 2 sản phẩm để so sánh!');
    }
}

// POPUP TÌM KIẾM SẢN PHẨM SO SÁNH
function openCompareSearch() {
    const modal = document.getElementById('compare-search-modal');
    if(modal) {
        modal.classList.remove('hidden');
        // Reset lại form tìm kiếm mỗi khi mở
        document.getElementById('compare-search-input').value = '';
        document.getElementById('compare-search-results').innerHTML = `
            <div class="text-center text-gray-400 text-sm py-12 flex flex-col items-center">
                <span class="material-symbols-outlined text-5xl mb-2 opacity-50">manage_search</span>
                Gõ tên sản phẩm để tìm kiếm...
            </div>`;
        // Tự động focus con trỏ vào ô nhập liệu
        setTimeout(() => document.getElementById('compare-search-input').focus(), 100);
    }
}

function closeCompareSearch() {
    const modal = document.getElementById('compare-search-modal');
    if(modal) modal.classList.add('hidden');
}

// Chống gọi API liên tục khi đang gõ phím
let compareSearchTimeout;
function debounceCompareSearch(event) {
    clearTimeout(compareSearchTimeout);
    compareSearchTimeout = setTimeout(() => {
        executeCompareSearch(event.target.value.trim());
    }, 500); // Ngừng gõ 0.5s mới gọi API
}

async function executeCompareSearch(keyword) {
    const container = document.getElementById('compare-search-results');
    if (!keyword) {
        container.innerHTML = '<div class="text-center text-gray-400 text-sm py-10">Gõ tên sản phẩm để tìm kiếm...</div>';
        return;
    }

    // Hiển thị trạng thái đang tải
    container.innerHTML = '<div class="text-center text-primary text-sm py-10 flex flex-col items-center"><span class="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span> Đang tìm kiếm...</div>';
    
    try {
        const res = await fetch(`${AppConfig.PRODUCT_API_URL}/products/search?keyword=${encodeURIComponent(keyword)}&limit=10&page=0`);
        
        if (res.ok) {
            const data = await res.json();
            const products = data.content || [];
            
            if (products.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 text-sm py-10">Không tìm thấy sản phẩm phù hợp.</div>';
                return;
            }

            // Lấy danh sách ID đang có trong So sánh để đổi màu nút "Đã thêm"
            const currentListIds = getCompareList().map(p => p.id);

            container.innerHTML = products.map(p => {
                const isAdded = currentListIds.includes(p.id);
                // Xử lý chuỗi nháy đơn, nháy kép
                const safeName = p.name ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "Sản phẩm";
                const safeThumbnail = p.thumbnail || "https://placehold.co/100";
                
                return `
                <div class="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-primary hover:shadow-md transition-all">
                    <img src="${safeThumbnail}" class="w-14 h-14 object-contain bg-gray-50 rounded-lg p-1.5 shrink-0 mix-blend-multiply">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm text-gray-800 line-clamp-1" title="${p.name}">${p.name}</h4>
                        <p class="text-sale-red font-black text-sm mt-1">${formatCurrencyCompare(p.salePrice || 0)}</p>
                    </div>
                    ${isAdded 
                        ? `<button disabled class="shrink-0 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-xs font-bold cursor-not-allowed border border-gray-200">Đã thêm</button>` 
                        : `<button onclick="selectProductForCompare(${p.id}, '${safeName}', '${safeThumbnail}', ${p.salePrice || 0})" class="shrink-0 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Thêm So Sánh</button>`
                    }
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="text-center text-red-500 text-sm py-10">Lỗi lấy dữ liệu từ hệ thống.</div>';
        }
    } catch(e) {
        console.error("Search Error:", e);
        container.innerHTML = '<div class="text-center text-red-500 text-sm py-10">Lỗi kết nối đến máy chủ.</div>';
    }
}

// Xử lý khi nhấn nút Thêm từ danh sách kết quả tìm kiếm
function selectProductForCompare(id, name, thumbnail, price) {
    // Thêm vào LocalStorage
    addToCompare(id, name, thumbnail, price);
    
    // Đóng Popup tìm kiếm
    closeCompareSearch();
    
    // Nếu người dùng đang đứng ở trang Bảng so sánh
    // Thì cần F5 lại trình duyệt và đổi URL để thêm cái máy mới vào Bảng lưới
    if (window.location.pathname.includes('compare.html')) {
        const list = getCompareList();
        const ids = list.map(p => p.id).join(',');
        window.location.href = `compare.html?ids=${ids}`;
    }
}

// TRANG CHI TIẾT SO SÁNH
document.addEventListener('DOMContentLoaded', async () => {
    // Lấy id từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const idsString = urlParams.get('ids');

    if (!idsString) {
        showEmptyState();
        return;
    }

    // Tách chuỗi ID thành mảng
    const ids = idsString.split(',').filter(id => id.trim() !== '');
    
    if (ids.length < 1) {
        showEmptyState();
        return;
    }

    await loadComparisonData(ids);
});

async function loadComparisonData(ids) {
    try {
        const productPromises = ids.map(id => 
            fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`).then(res => {
                if(!res.ok) throw new Error("Lỗi tải SP ID: " + id);
                return res.json();
            })
        );

        const products = await Promise.all(productPromises);

        // Tiến hành vẽ giao diện
        renderCompareHeader(products);
        renderCompareBody(products);

    } catch (error) {
        console.error("Lỗi trang so sánh:", error);
        alert("Không thể lấy dữ liệu sản phẩm. Vui lòng kiểm tra lại kết nối Backend!");
        showEmptyState();
    }
}

function renderCompareHeader(products) {
    const headerRow = document.getElementById('compare-header-row');
    if(!headerRow) return;

    headerRow.innerHTML = `<th class="w-1/4 min-w-[200px] sticky left-0 bg-gray-50 z-20"></th>`;
    
    products.forEach(p => {
        const th = document.createElement('th');
        th.className = "w-1/4 p-6 align-top border-l border-gray-100";
        th.innerHTML = `
            <div class="relative flex flex-col items-center text-center">
                <button onclick="removeAndRefresh(${p.id})" class="absolute -top-2 -right-2 text-gray-400 hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-[22px]">cancel</span>
                </button>
                <div class="w-full aspect-square bg-gray-50 rounded-2xl mb-4 p-4 flex items-center justify-center">
                    <img src="${p.thumbnail || 'https://placehold.co/150'}" class="max-h-full max-w-full object-contain mix-blend-multiply">
                </div>
                <h3 class="font-black text-gray-900 text-sm line-clamp-2 leading-snug mb-2 h-10">${p.name}</h3>
                <a href="product_detail.html?id=${p.id}" class="text-xs text-primary font-bold hover:underline">Xem chi tiết</a>
            </div>
        `;
        headerRow.appendChild(th);
    });

    // Nếu mới có 2 máy, hiện thêm ô "Thêm" để lấp đầy bảng
    if (products.length < 3) {
        const addTh = document.createElement('th');
        addTh.className = "w-1/4 p-6 align-top border-l border-gray-100";
        addTh.innerHTML = `
            <div onclick="openCompareSearch()" class="w-full h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/30 rounded-2xl text-gray-400 hover:text-primary hover:border-primary hover:bg-blue-50 cursor-pointer transition-all group">
                <span class="material-symbols-outlined text-4xl mb-2">add_circle</span>
                <span class="font-bold text-xs">Thêm sản phẩm</span>
            </div>
        `;
        headerRow.appendChild(addTh);
    }
}

function renderCompareBody(products) {
    const tbody = document.getElementById('compare-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    const formatCurrency = (amount) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    // Dòng Giá
    let priceRow = `<tr class="border-b border-gray-50"><td class="font-bold text-gray-500 text-xs uppercase p-4 sticky left-0 bg-white">Giá bán</td>`;
    products.forEach(p => {
        priceRow += `<td class="p-4 text-lg font-black text-sale-red border-l border-gray-50">${formatCurrency(p.salePrice)}</td>`;
    });
    if(products.length < 3) priceRow += `<td class="p-4 bg-gray-50/30 border-l border-gray-50"></td>`;
    tbody.innerHTML += priceRow + `</tr>`;

    // Dòng Tình trạng
    let stockRow = `<tr class="border-b border-gray-50"><td class="font-bold text-gray-500 text-xs uppercase p-4 sticky left-0 bg-white">Tình trạng</td>`;
    products.forEach(p => {
        const stockStatus = p.stock > 0 ? `<span class="text-emerald-600 font-bold">Còn hàng</span>` : `<span class="text-red-500 font-bold">Hết hàng</span>`;
        stockRow += `<td class="p-4 text-sm border-l border-gray-50">${stockStatus} (${p.stock} máy)</td>`;
    });
    if(products.length < 3) stockRow += `<td class="p-4 bg-gray-50/30 border-l border-gray-50"></td>`;
    tbody.innerHTML += stockRow + `</tr>`;

    // THÔNG SỐ KỸ THUẬT ĐỘNG
    const allSpecKeys = new Set();
    const specLabels = {};

    products.forEach(p => {
        if (p.specs) Object.keys(p.specs).forEach(k => allSpecKeys.add(k));
        if (p.categoryConfig && p.categoryConfig.labels) Object.assign(specLabels, p.categoryConfig.labels);
    });

    allSpecKeys.forEach(key => {
        const label = specLabels[key] || key.toUpperCase();
        let row = `<tr class="border-b border-gray-50"><td class="font-bold text-gray-900 text-sm p-4 sticky left-0 bg-white">${label}</td>`;
        products.forEach(p => {
            const val = (p.specs && p.specs[key]) ? p.specs[key] : '<span class="text-gray-300">—</span>';
            row += `<td class="p-4 text-sm text-gray-600 border-l border-gray-50">${val}</td>`;
        });
        if(products.length < 3) row += `<td class="p-4 bg-gray-50/30 border-l border-gray-50"></td>`;
        tbody.innerHTML += row + `</tr>`;
    });
}

function showEmptyState() {
    const tableContainer = document.querySelector('.bg-white.rounded-3xl');
    if(tableContainer) tableContainer.classList.add('hidden');
    document.getElementById('no-compare-data')?.classList.remove('hidden');
}

// Xóa 1 máy khỏi danh sách và load lại trang
function removeAndRefresh(id) {
    let list = JSON.parse(localStorage.getItem('tcp_compare_list')) || [];
    list = list.filter(p => p.id != id);
    localStorage.setItem('tcp_compare_list', JSON.stringify(list));

    if (list.length === 0) {
        window.location.href = 'products.html';
    } else {
        const ids = list.map(p => p.id).join(',');
        window.location.href = `compare.html?ids=${ids}`;
    }
}