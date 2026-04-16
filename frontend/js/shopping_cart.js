// BIẾN TOÀN CỤC
let currentCartData = null;
let globalSubTotal = 0;
let currentDiscount = 0;
let currentShippingFee = 0; 
let currentVoucherCode = "";

let userAddresses = [];
let availableVouchers = [];
let selectedAddress = null;

document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    loadAddresses();
    loadAvailableVouchers();
});

// Hàm format tiền tệ
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
};

// LOGIC GIỎ HÀNG
async function loadCart() {
    const token = AuthUtils.getToken();
    if (!token) return;

    try {
        const response = await fetch(AppConfig.CART_API_URL, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (response.status === 403 || response.status === 401) {
            AuthUtils.logout();
            return;
        }

        if (response.ok) {
            currentCartData = await response.json();
            renderCartItems(currentCartData.items);
            renderCartSummary(currentCartData);
        }
    } catch (error) {
        console.error("Lỗi tải giỏ hàng:", error);
    }
}

function renderCartItems(items) {
    const container = document.getElementById("cart-items-container");
    const emptyCartEl = document.getElementById("empty-cart-message");
    const cartContentEl = document.getElementById("cart-content-wrapper");
    const selectAllCheckbox = document.getElementById("select-all");

    if (!items || items.length === 0) {
        if (cartContentEl) cartContentEl.classList.add("hidden");
        if (emptyCartEl) emptyCartEl.classList.remove("hidden");
        renderCartSummary({ items: [] });
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        return;
    }

    if (cartContentEl) cartContentEl.classList.remove("hidden");
    if (emptyCartEl) emptyCartEl.classList.add("hidden");

    if (selectAllCheckbox) {
        const isAllSelected = items.every((item) => item.isSelected);
        selectAllCheckbox.checked = isAllSelected;
        const labelSelectAll = document.querySelector('label[for="select-all"]');
        if (labelSelectAll) {
            labelSelectAll.innerText = `Chọn tất cả (${items.length} sản phẩm)`;
        }
    }

    container.innerHTML = items.map((item) => {
        let discountHtml = "";
        let basePriceHtml = "";

        if (item.basePrice && item.basePrice > item.price) {
            const percent = Math.round(((item.basePrice - item.price) / item.basePrice) * 100);
            discountHtml = `<span class="bg-sale-red/10 text-sale-red text-[10px] font-bold px-2 py-0.5 rounded">-${percent}%</span>`;
            basePriceHtml = `<div class="text-sm text-gray-400 line-through">${formatCurrency(item.basePrice)}</div>`;
        }

        let colorHtml = "";
        if (item.selectedColor && item.selectedColor !== "null" && item.selectedColor.trim() !== "") {
            colorHtml = `<span class="text-gray-500 dark:text-gray-400 text-sm"> | Màu: ${item.selectedColor}</span>`;
        }

        let stockHtml = item.stock > 0 
            ? `<p class="text-xs text-orange-500 font-medium mt-1">Còn ${item.stock} sản phẩm</p>`
            : `<p class="text-xs text-red-500 font-medium mt-1">Hết hàng</p>`;


        const isMinQuantity = item.quantity <= 1;
        const isMaxQuantity = item.quantity >= item.stock;

        return `
        <div class="bg-white dark:bg-[#1e2125] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative group hover:border-primary/30 transition-all duration-300">
            <button onclick="removeCartItem(${item.id})" class="absolute top-4 right-4 text-gray-400 hover:text-sale-red transition-colors p-2">
                <span class="material-symbols-outlined">delete</span>
            </button>
            <div class="flex flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <div class="shrink-0 flex items-center self-center sm:self-center h-full">
                    <input type="checkbox" ${item.isSelected ? "checked" : ""} 
                        onchange="updateCartItem(${item.id}, null, this.checked)"
                        class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-[#25282c] dark:border-gray-600 cursor-pointer" />
                </div>
                <div class="flex flex-col sm:flex-row gap-6 flex-1">
                    <div class="w-full sm:w-32 aspect-square bg-[#f8fcfc] dark:bg-[#25282c] rounded-xl flex items-center justify-center p-2 shrink-0">
                        <img src="${item.productThumbnail || 'https://placehold.co/100'}" alt="${item.productName}" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" onerror="this.src='https://placehold.co/100?text=No+Img'" />
                    </div>
                    <div class="flex-1 flex flex-col justify-between gap-4">
                        <div>
                            <div class="flex flex-wrap gap-2 mb-2">
                                <span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">Sản phẩm</span>
                                ${discountHtml}
                            </div>
                            <h3 class="text-lg font-bold text-[#101818] dark:text-white leading-snug mb-1">
                                <a href="product-detail.html?id=${item.productId}" class="hover:text-primary transition-colors">${item.productName}</a>
                            </h3>
                            <div class="flex items-center flex-wrap gap-1">
                                <span class="text-sm text-gray-500 dark:text-gray-400">SKU: ${item.skuId || "N/A"}</span>
                                ${colorHtml}
                            </div>
                            ${stockHtml}
                        </div>
                        <div class="flex items-end justify-between flex-wrap gap-4">
                            
                            <div class="flex items-center bg-[#f0f5f5] dark:bg-[#25282c] rounded-lg p-1">
                                <button 
                                    ${isMinQuantity ? 'disabled' : `onclick="updateCartItem(${item.id}, ${item.quantity - 1}, null)"`} 
                                    class="w-8 h-8 flex items-center justify-center rounded transition-colors ${isMinQuantity ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:bg-white dark:hover:bg-[#1e2125] text-gray-500'}">
                                    <span class="material-symbols-outlined text-sm">remove</span>
                                </button>
                                
                                <input class="w-10 bg-transparent border-none text-center font-semibold text-sm p-0 focus:ring-0" type="text" value="${item.quantity}" readonly />
                                
                                <button 
                                    ${isMaxQuantity ? `onclick="alert('Rất tiếc, cửa hàng chỉ còn ${item.stock} sản phẩm này!');"` : `onclick="updateCartItem(${item.id}, ${item.quantity + 1}, null)"`} 
                                    class="w-8 h-8 flex items-center justify-center rounded transition-colors ${isMaxQuantity ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:bg-white dark:hover:bg-[#1e2125] text-gray-500'}">
                                    <span class="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>

                            <div class="text-right">
                                <div class="text-xl font-bold text-sale-red">${formatCurrency(item.subTotal)}</div>
                                ${basePriceHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join("");
}

function renderCartSummary(cart) {
    const items = cart.items || [];
    const selectedItems = items.filter(item => item.isSelected);
    
    const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    globalSubTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Tính tổng tiền cuối cùng
    let finalTotal = globalSubTotal - currentDiscount + currentShippingFee;
    if (finalTotal < 0) finalTotal = 0;

    const elItems = document.getElementById("summary-total-items");
    const elSub = document.getElementById("summary-subtotal");
    const elDiscount = document.getElementById("summary-discount");
    const elShip = document.getElementById("summary-shipping");
    const elFinal = document.getElementById("summary-final-total");
    const headerCountEl = document.getElementById("header-cart-count");

    if (elItems) elItems.innerText = `${totalItems} sản phẩm`;
    if (headerCountEl) headerCountEl.innerText = `(${totalItems} sản phẩm)`;
    if (elSub) elSub.innerText = formatCurrency(globalSubTotal);
    if (elDiscount) elDiscount.innerText = `-${formatCurrency(currentDiscount)}`;
    if (elShip) elShip.innerText = currentShippingFee === 0 ? "Miễn phí" : formatCurrency(currentShippingFee);
    if (elFinal) elFinal.innerText = formatCurrency(finalTotal);

    // Nếu bỏ chọn sản phẩm làm SubTotal < số tiền đang giảm -> Xóa mã giảm giá để bắt áp lại
    if (currentVoucherCode && globalSubTotal < currentDiscount) {
        clearVoucher(); 
    }
}

async function updateCartItem(itemId, newQuantity, isSelected) {
    const token = AuthUtils.getToken();
    let url = `${AppConfig.CART_API_URL}/item/${itemId}?`;
    if (newQuantity !== null) url += `quantity=${newQuantity}&`;
    if (isSelected !== null) url += `isSelected=${isSelected}`;

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
            currentCartData = await response.json();
            renderCartItems(currentCartData.items);
            renderCartSummary(currentCartData);
        }
    } catch (error) { console.error("Lỗi cập nhật:", error); }
}

async function removeCartItem(itemId) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    const token = AuthUtils.getToken();
    try {
        const response = await fetch(`${AppConfig.CART_API_URL}/item/${itemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
            currentCartData = await response.json();
            renderCartItems(currentCartData.items);
            renderCartSummary(currentCartData);
            if (typeof HeaderLogic !== "undefined") HeaderLogic.updateCartBadge();
        }
    } catch (error) { console.error("Lỗi xóa:", error); }
}

async function toggleSelectAll(isSelected) {
    const token = AuthUtils.getToken();
    try {
        const response = await fetch(`${AppConfig.CART_API_URL}/select-all?isSelected=${isSelected}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
            currentCartData = await response.json();
            renderCartItems(currentCartData.items);
            renderCartSummary(currentCartData);
        }
    } catch (error) { console.error("Lỗi chọn tất cả:", error); }
}

// LOGIC MÃ GIẢM GIÁ
// Lấy danh sách mã đang hiển thị
async function loadAvailableVouchers() {
    try {
        const res = await fetch(`${AppConfig.ORDER_API_URL}/vouchers/public/active`);
        if(res.ok) {
            availableVouchers = await res.json();
        }
    } catch(e) { console.error("Lỗi tải danh sách voucher:", e); }
}

// Mở Modal hiển thị mã
function openVoucherModal() {
    const container = document.getElementById("voucher-list-container");
    
    if(availableVouchers.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-gray-500">Hiện không có mã khuyến mãi nào.</div>`;
    } else {
        container.innerHTML = availableVouchers.map(v => {
            // Kiểm tra xem đơn hàng hiện tại có đủ điều kiện áp mã này không
            const isEligible = globalSubTotal >= (v.minOrderAmount || 0);
            
            const discountText = v.discountType === 'PERCENTAGE' 
                ? `Giảm ${v.discountValue}%` 
                : `Giảm ${formatCurrency(v.discountValue)}`;
            
            const maxText = v.maxDiscountAmount ? ` (Tối đa ${formatCurrency(v.maxDiscountAmount)})` : '';
            
            return `
            <div class="flex items-center justify-between p-4 mb-3 bg-white dark:bg-[#25282c] border ${isEligible ? 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary shadow-sm' : 'border-gray-100 opacity-60 cursor-not-allowed'} rounded-xl transition-all" 
                 ${isEligible ? `onclick="selectVoucher('${v.voucherCode}')"` : ''}>
                
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-sale-red/10 text-sale-red flex items-center justify-center rounded-full font-black text-lg">
                        %
                    </div>
                    <div>
                        <h4 class="font-bold text-[#101818] dark:text-white uppercase">${v.voucherCode}</h4>
                        <p class="text-xs font-semibold text-sale-red mb-0.5">${discountText}${maxText}</p>
                        <p class="text-[10px] text-gray-500">Đơn tối thiểu ${formatCurrency(v.minOrderAmount || 0)}</p>
                    </div>
                </div>
                
                <div>
                    ${isEligible 
                        ? `<button class="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg">Dùng</button>` 
                        : `<span class="text-[10px] text-gray-400 font-medium">Chưa đủ ĐK</span>`}
                </div>
            </div>`;
        }).join('');
    }

    const modal = document.getElementById("voucher-modal");
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

function closeVoucherModal() {
    const modal = document.getElementById("voucher-modal");
    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden"), 300);
}

async function selectVoucher(code) {
    closeVoucherModal();
    await applyVoucher(code);
}

async function applyVoucher(code) {
    const msgEl = document.getElementById("voucher-message");

    if (globalSubTotal === 0) {
        alert("Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá!");
        return;
    }

    try {
        const token = AuthUtils.getToken();
        const res = await fetch(`${AppConfig.ORDER_API_URL}/vouchers/validate?code=${code}&subTotal=${globalSubTotal}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();

        if (res.ok && data.isValid) {
            // Áp mã thành công
            currentDiscount = data.discountAmount;
            currentVoucherCode = data.voucherCode;

            document.getElementById("display-voucher-code").innerText = `Đã áp dụng mã: ${data.voucherCode}`;
            document.getElementById("display-voucher-code").classList.add("text-emerald-600");
            document.getElementById("display-voucher-desc").innerText = `Được giảm -${formatCurrency(currentDiscount)}`;
            document.getElementById("btn-clear-voucher").classList.remove("hidden");

            msgEl.innerText = "Áp mã thành công!";
            msgEl.classList.remove("hidden", "text-red-500");
            msgEl.classList.add("text-emerald-500");

            renderCartSummary(currentCartData);
        } else {
            clearVoucher();
            alert("Mã giảm giá không hợp lệ: " + (data.message || ""));
        }
    } catch (e) {
        console.error("Lỗi áp mã:", e);
    }
}

// hủy bỏ mã giảm giá
function clearVoucher() {
    currentDiscount = 0;
    currentVoucherCode = "";
    
    document.getElementById("display-voucher-code").innerText = "Chọn mã giảm giá";
    document.getElementById("display-voucher-code").classList.remove("text-emerald-600");
    document.getElementById("display-voucher-desc").innerText = "Bấm để xem các mã có sẵn";
    
    document.getElementById("btn-clear-voucher").classList.add("hidden");
    document.getElementById("voucher-message").classList.add("hidden");

    renderCartSummary(currentCartData);
}

// ĐỊA CHỈ
async function loadAddresses() {
    const token = AuthUtils.getToken();
    if(!token) return;

    try {
        const res = await fetch(`${AppConfig.BASE_URL}/users/addresses/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            userAddresses = await res.json(); 
            
            if(userAddresses && userAddresses.length > 0) {
                // Ưu tiên chọn địa chỉ mặc định
                selectedAddress = userAddresses.find(a => a.isDefault === true || a.default === true) || userAddresses[0];
                updateAddressUI();
            } else {
                showEmptyAddressUI();
            }
        } else {
            console.error("Không thể tải danh sách địa chỉ, HTTP Status:", res.status);
            showEmptyAddressUI();
        }
    } catch (e) {
        console.error("Lỗi tải địa chỉ:", e);
        showEmptyAddressUI();
    }
}

function updateAddressUI() {
    if(!selectedAddress) return;

    const fullAddrStr = `${selectedAddress.detailAddress}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.provinceCity}`;
    
    document.getElementById("display-receiver-name").innerText = selectedAddress.receiverName;
    document.getElementById("display-receiver-phone").innerText = selectedAddress.phoneNumber;
    document.getElementById("display-full-address").innerText = fullAddrStr;

    document.getElementById("order-receiver-name").value = selectedAddress.receiverName;
    document.getElementById("order-receiver-phone").value = selectedAddress.phoneNumber;
    document.getElementById("order-shipping-address").value = fullAddrStr;
}

function showEmptyAddressUI() {
    document.getElementById("display-receiver-name").innerText = "Chưa có địa chỉ";
    document.getElementById("display-receiver-phone").innerText = "";
    document.getElementById("display-full-address").innerHTML = `<span class="text-red-500">Vui lòng thêm địa chỉ nhận hàng trước khi thanh toán!</span>`;
}

// Xử lý Modal chọn địa chỉ
function openAddressModal() {
    const container = document.getElementById("address-list-container");
    
    if (!userAddresses || userAddresses.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-gray-500">Bạn chưa có địa chỉ nào.</div>`;
    } else {
        container.innerHTML = userAddresses.map(addr => {
            const isSelected = selectedAddress && selectedAddress.addressId === addr.addressId;
            const isDefault = addr.isDefault === true || addr.default === true;

            return `
            <label class="flex items-start gap-3 p-4 rounded-xl border ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'} cursor-pointer hover:border-primary/50 transition-colors">
                <input type="radio" name="modal-address" value="${addr.addressId}" ${isSelected ? 'checked' : ''} class="mt-1 text-primary focus:ring-primary" />
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-[#101818] dark:text-white">${addr.receiverName}</span>
                        <span class="text-gray-400">|</span>
                        <span class="text-gray-600 dark:text-gray-300 text-sm">${addr.phoneNumber}</span>
                        ${isDefault ? `<span class="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Mặc định</span>` : ''}
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${addr.detailAddress}, ${addr.ward}, ${addr.district}, ${addr.provinceCity}</p>
                </div>
            </label>
            `;
        }).join("");
    }

    const modal = document.getElementById("address-modal");
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

function closeAddressModal() {
    const modal = document.getElementById("address-modal");
    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden"), 300);
}

function confirmAddressSelection() {
    const checkedRadio = document.querySelector('input[name="modal-address"]:checked');
    if (checkedRadio) {
        const addrId = parseInt(checkedRadio.value);
        selectedAddress = userAddresses.find(a => a.addressId === addrId);
        updateAddressUI();
    }
    closeAddressModal();
}

// ĐẶT HÀNG
async function placeOrder() {
    if (!AuthUtils.isLoggedIn()) {
        alert("Vui lòng đăng nhập để đặt hàng!");
        window.location.href = "login.html";
        return;
    }

    if (!currentCartData || !currentCartData.items || currentCartData.items.length === 0) {
        alert("Giỏ hàng của bạn đang trống!");
        return;
    }

    const selectedItems = currentCartData.items.filter((item) => item.isSelected);
    if (selectedItems.length === 0) {
        alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
        return;
    }

    const receiverName = document.getElementById("order-receiver-name").value;
    const receiverPhone = document.getElementById("order-receiver-phone").value;
    const shippingAddress = document.getElementById("order-shipping-address").value;

    if (!receiverName || !receiverPhone || !shippingAddress) {
        alert("Vui lòng chọn Địa chỉ nhận hàng!");
        openAddressModal();
        return;
    }

    const paymentRadio = document.querySelector('input[name="payment"]:checked');
    const paymentMethod = paymentRadio ? paymentRadio.value : "COD";

    const orderItems = selectedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productThumbnail: item.productThumbnail,
        quantity: item.quantity,
        unitPrice: item.price,
    }));

    const orderPayload = {
        receiverName,
        receiverPhone,
        shippingAddress,
        paymentMethod,
        voucherCode: currentVoucherCode,
        shippingFee: currentShippingFee,
        discountAmount: currentDiscount,
        items: orderItems,
    };

    const btn = document.getElementById("btn-place-order");
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...`;

    try {
        const token = AuthUtils.getToken();
        const response = await fetch(`${AppConfig.ORDER_API_URL}/orders/create`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orderPayload),
        });

        if (response.ok) {
            const orderData = await response.json();

            const deleteRequests = selectedItems.map((item) =>
                fetch(`${AppConfig.CART_API_URL}/item/${item.id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                })
            );
            await Promise.all(deleteRequests);

            if (typeof HeaderLogic !== "undefined") HeaderLogic.updateCartBadge();

            // Trích xuất mã đơn hàng
            let finalOrderCode = orderData.orderCode || orderData.order_code;
            if (!finalOrderCode && orderData.data) {
                finalOrderCode = orderData.data.orderCode || orderData.data.order_code;
            }

            if (!finalOrderCode) {
                alert("Lỗi: Không tìm thấy 'orderCode' trả về từ Server.");
                return;
            }

            window.location.href = `payment_success.html?orderCode=${finalOrderCode}`;
        } else {
            const errorText = await response.text();
            alert("Lỗi đặt hàng: " + errorText);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

function continueShopping(event) {
    if (event) event.preventDefault();
    if (window.history.length > 1 && document.referrer !== "") {
        window.history.back();
    } else {
        window.location.href = "home.html";
    }
}