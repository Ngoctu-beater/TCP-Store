const AddressManager = {
    // Tải và hiển thị danh sách địa chỉ
    async renderAddresses() {
        const container = document.getElementById("address-list-container");
        if (!container) return;

        container.innerHTML = `<div class="p-6 text-center text-gray-500">Đang tải danh sách...</div>`;

        try {
            const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/all`, {
                headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
            });
            const addresses = await response.json();
            container.innerHTML = "";

            if (!addresses || addresses.length === 0) {
                container.innerHTML = `<div class="p-10 text-center text-gray-400">Bạn chưa lưu địa chỉ nào.</div>`;
                return;
            }

            addresses.forEach(addr => {
                const item = document.createElement("div");
                item.className = "p-6 flex flex-col md:flex-row justify-between gap-6 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30";
                item.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="font-bold text-lg text-[#101818] dark:text-white border-r border-gray-300 dark:border-gray-700 pr-3">${addr.receiverName}</span>
                            <span class="text-gray-500 dark:text-gray-400 font-medium">${addr.phoneNumber}</span>
                            ${addr.isDefault ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-cyan-500 text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10">Mặc định</span>` : ''}
                        </div>
                        <div class="text-gray-600 dark:text-gray-400 leading-relaxed">
                            <p>${addr.detailAddress}</p>
                        </div>
                        <div class="text-gray-600 dark:text-gray-400 leading-relaxed">
                            <p>${addr.ward}, ${addr.district}, ${addr.provinceCity}</p>
                        </div>
                    </div>
                    <div class="flex flex-row md:flex-col justify-end items-end gap-3">
                        <div class="flex gap-4">
                            <button type="button" onclick="AddressManager.openEditModal(${addr.addressId})" class="text-cyan-500 hover:text-cyan-600 text-sm font-bold transition-colors">Cập nhật</button>
                            <button type="button" onclick="AddressManager.deleteAddress(${addr.addressId})" class="text-red-500 hover:text-red-600 text-sm font-bold transition-colors">Xóa</button>
                        </div>
                        ${!addr.isDefault ? `
                            <button type="button" onclick="AddressManager.setDefault(${addr.addressId})" class="px-4 py-2 border border-cyan-200 text-cyan-500 hover:bg-cyan-50 text-sm rounded-lg transition-all">
                                Thiết lập mặc định
                            </button>` : ''}
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            container.innerHTML = `<div class="p-6 text-center text-red-500">Lỗi kết nối máy chủ.</div>`;
        }
    },

    // Validate dữ liệu
    validate() {
        let isValid = true;
        const data = {
            receiverName: document.getElementById("receiverName").value.trim(),
            phoneNumber: document.getElementById("phoneNumber").value.trim(),
            provinceCity: document.getElementById("provinceCity").value.trim(),
            district: document.getElementById("district").value.trim(),
            ward: document.getElementById("ward").value.trim(),
            detailAddress: document.getElementById("detailAddress").value.trim()
        };

        // Check rỗng
        Object.keys(data).forEach(key => {
            const errorEl = document.getElementById(`error-${key}`);
            if (!data[key]) {
                errorEl.innerText = "Không được để trống";
                errorEl.classList.remove("hidden");
                isValid = false;
            } else {
                errorEl.classList.add("hidden");
            }
        });

        // Check số điện thoại
        const phoneRegex = /^(0|84)(3|5|7|8|9)([0-9]{8})$/;
        if (data.phoneNumber && !phoneRegex.test(data.phoneNumber)) {
            const phoneError = document.getElementById("error-phoneNumber");
            phoneError.innerText = "Số điện thoại không hợp lệ";
            phoneError.classList.remove("hidden");
            isValid = false;
        }

        return isValid ? data : null;
    },

    // Lưu (Thêm/Sửa)
    async save() {
        const validatedData = this.validate();
        if (!validatedData) return;

        const id = document.getElementById("address-id").value;
        const isDefault = document.getElementById("isDefault").checked;
        const payload = { ...validatedData, isDefault };

        const url = id ? `${AppConfig.BASE_URL}/users/addresses/${id}` : `${AppConfig.BASE_URL}/users/addresses`;
        const method = id ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${AuthUtils.getToken()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toggleModal();
                this.renderAddresses();
                alert(id ? "Cập nhật địa chỉ thành công" : "Thêm địa chỉ thành công");
            }
        } catch (error) {
            alert("Lỗi khi lưu địa chỉ");
        }
    },

    // Xóa địa chỉ
    async deleteAddress(id) {
        if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
        try {
            const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
            });

            if (response.ok) {
                this.renderAddresses();
                alert("Địa chỉ đã được xóa");
            } else {
                const errorMessage = await response.text(); 
                alert(errorMessage);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Không thể kết nối đến máy chủ");
        }
    },

    // Thiết lập mặc định
    async setDefault(id) {
        if (!confirm("Bạn có chắc muốn thiết lập địa chỉ này làm mặc định?")) return;
        try {
            const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/${id}/default`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${AuthUtils.getToken()}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                this.renderAddresses();
                alert("Địa chỉ đã được thiết lập làm mặc định");
            } else {
                const errorData = await response.text();
                alert("Lỗi: " + errorData);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Không thể kết nối đến máy chủ");
        }
    },

    // Mở modal sửa và đổ dữ liệu
    async openEditModal(id) {
    try {
        const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/${id}`, {
            headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
        });
        const result = await response.json();
        
        const addr = result.data ? result.data : result; 

        document.getElementById("address-id").value = addr.id || addr.addressId || "";
        document.getElementById("receiverName").value = addr.receiverName || "";
        document.getElementById("phoneNumber").value = addr.phoneNumber || "";
        document.getElementById("provinceCity").value = addr.provinceCity || "";
        document.getElementById("district").value = addr.district || "";
        document.getElementById("ward").value = addr.ward || "";
        document.getElementById("detailAddress").value = addr.detailAddress || "";
        document.getElementById("isDefault").checked = addr.isDefault || false;

        toggleModal(); 
    } catch (error) {
        console.error("Lỗi chi tiết:", error);
        alert("Không thể lấy thông tin địa chỉ");
    }
}
};

// Hàm điều khiển Modal
window.toggleModal = function() {
    const modal = document.getElementById("address-modal");
    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
        document.getElementById("address-form").reset(); // Reset form khi đóng
        document.getElementById("address-id").value = "";
    }
};

// Lắng nghe sự kiện khi trang sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    AddressManager.renderAddresses();

    const form = document.getElementById("address-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            AddressManager.save();
        });
    }
});