const PROVINCE_API = "https://provinces.open-api.vn/api";

const AddressManager = {
    // 1. KHỞI TẠO
    async init() {
        await this.loadProvinces();
        this.setupSelectEvents();
        this.renderAddresses();
    },

    // Sự kiện thay đổi dropdown
    setupSelectEvents() {
        const provinceSelect = document.getElementById("provinceCity");
        const districtSelect = document.getElementById("district");

        provinceSelect.addEventListener("change", async (e) => {
            const pCode = e.target.options[e.target.selectedIndex].dataset.code;
            if (pCode) await this.loadDistricts(pCode);
            else {
                this.resetSelect("district", "Chọn Quận/Huyện");
                this.resetSelect("ward", "Chọn Phường/Xã");
            }
        });

        districtSelect.addEventListener("change", async (e) => {
            const dCode = e.target.options[e.target.selectedIndex].dataset.code;
            if (dCode) await this.loadWards(dCode);
            else this.resetSelect("ward", "Chọn Phường/Xã");
        });
    },

    // --- API TỈNH THÀNH ---
    async loadProvinces() {
        try {
            const res = await fetch(`${PROVINCE_API}/p/`);
            const data = await res.json();
            const select = document.getElementById("provinceCity");
            select.innerHTML = '<option value="" selected disabled>Chọn Tỉnh/Thành phố</option>';
            data.forEach(p => {
                const opt = new Option(p.name, p.name);
                opt.dataset.code = p.code;
                select.add(opt);
            });
        } catch (e) { console.error("Lỗi tải tỉnh:", e); }
    },

    async loadDistricts(pCode) {
        try {
            const res = await fetch(`${PROVINCE_API}/p/${pCode}?depth=2`);
            const data = await res.json();
            const select = document.getElementById("district");
            this.resetSelect("district", "Chọn Quận/Huyện");
            this.resetSelect("ward", "Chọn Phường/Xã");
            data.districts.forEach(d => {
                const opt = new Option(d.name, d.name);
                opt.dataset.code = d.code;
                select.add(opt);
            });
            select.disabled = false;
        } catch (e) { console.error(e); }
    },

    async loadWards(dCode) {
        try {
            const res = await fetch(`${PROVINCE_API}/d/${dCode}?depth=2`);
            const data = await res.json();
            const select = document.getElementById("ward");
            this.resetSelect("ward", "Chọn Phường/Xã");
            data.wards.forEach(w => {
                const opt = new Option(w.name, w.name);
                opt.dataset.code = w.code;
                select.add(opt);
            });
            select.disabled = false;
        } catch (e) { console.error(e); }
    },

    resetSelect(id, text) {
        const el = document.getElementById(id);
        el.innerHTML = `<option value="" selected disabled>${text}</option>`;
        el.disabled = true;
    },

    // --- HIỂN THỊ DANH SÁCH (Đã khôi phục Badge và Nút mặc định) ---
    async renderAddresses() {
        const container = document.getElementById("address-list-container");
        if (!container) return;

        try {
            const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/all`, {
                headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
            });
            const addresses = await response.json();
            container.innerHTML = addresses.length ? "" : '<div class="p-10 text-center text-gray-400">Chưa có địa chỉ nào.</div>';

            addresses.forEach(addr => {
                const item = document.createElement("div");
                item.className = "p-6 flex flex-col md:flex-row justify-between gap-6 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50/50";
                item.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-lg text-gray-900 dark:text-white">${addr.receiverName}</span>
                            <span class="text-gray-500 font-medium border-l border-gray-300 pl-3">${addr.phoneNumber}</span>
                            ${addr.isDefault ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-cyan-500 text-cyan-500 bg-cyan-50">Mặc định</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            ${addr.detailAddress}<br>
                            ${addr.ward}, ${addr.district}, ${addr.provinceCity}
                        </p>
                    </div>
                    <div class="flex flex-row md:flex-col justify-end items-end gap-3">
                        <div class="flex gap-4">
                            <button onclick="AddressManager.edit(${addr.addressId})" class="text-cyan-500 text-sm font-bold">Cập nhật</button>
                            <button onclick="AddressManager.delete(${addr.addressId})" class="text-red-500 text-sm font-bold">Xóa</button>
                        </div>
                        ${!addr.isDefault ? `
                            <button onclick="AddressManager.setDefault(${addr.addressId})" class="px-4 py-2 border border-cyan-200 text-cyan-500 hover:bg-cyan-50 text-sm rounded-lg transition-all">
                                Thiết lập mặc định
                            </button>` : ''}
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (error) { console.error("Lỗi render:", error); }
    },

    // --- THIẾT LẬP MẶC ĐỊNH (KHÔI PHỤC) ---
    async setDefault(id) {
        if (!confirm("Thiết lập địa chỉ này làm mặc định?")) return;
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
            } else {
                alert("Không thể thiết lập mặc định.");
            }
        } catch (error) { console.error("Lỗi kết nối:", error); }
    },

    // --- LƯU & SỬA ---
    async save() {
        const payload = {
            addressId: document.getElementById("address-id").value || null,
            receiverName: document.getElementById("receiverName").value.trim(),
            phoneNumber: document.getElementById("phoneNumber").value.trim(),
            provinceCity: document.getElementById("provinceCity").value,
            district: document.getElementById("district").value,
            ward: document.getElementById("ward").value,
            detailAddress: document.getElementById("detailAddress").value.trim(),
            isDefault: document.getElementById("isDefault").checked
        };

        if (!payload.provinceCity || !payload.district || !payload.ward) {
            alert("Vui lòng chọn đầy đủ Tỉnh/Huyện/Xã!");
            return;
        }

        try {
            const method = payload.addressId ? "PUT" : "POST";
            const url = payload.addressId 
                ? `${AppConfig.BASE_URL}/users/addresses/${payload.addressId}`
                : `${AppConfig.BASE_URL}/users/addresses`;

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
            }
        } catch (error) { alert("Lỗi khi lưu!"); }
    },

    async edit(addressId) {
        try {
            const response = await fetch(`${AppConfig.BASE_URL}/users/addresses/${addressId}`, {
                headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
            });
            const addr = await response.json();

            window.toggleModal(true); 
            
            document.getElementById("address-id").value = addr.addressId;
            document.getElementById("receiverName").value = addr.receiverName;
            document.getElementById("phoneNumber").value = addr.phoneNumber;
            document.getElementById("detailAddress").value = addr.detailAddress;
            document.getElementById("isDefault").checked = addr.isDefault;

            // Xử lý nạp Tỉnh/Huyện/Xã
            const provinceSelect = document.getElementById("provinceCity");
            provinceSelect.value = addr.provinceCity;

            const pOption = Array.from(provinceSelect.options).find(o => o.value === addr.provinceCity);
            if (pOption) {
                await this.loadDistricts(pOption.dataset.code);
                const districtSelect = document.getElementById("district");
                districtSelect.value = addr.district;

                const dOption = Array.from(districtSelect.options).find(o => o.value === addr.district);
                if (dOption) {
                    await this.loadWards(dOption.dataset.code);
                    document.getElementById("ward").value = addr.ward;
                }
            }
        } catch (error) { console.error(error); }
    },

    async delete(id) {
        if (!confirm("Xóa địa chỉ này?")) return;
        try {
            await fetch(`${AppConfig.BASE_URL}/users/addresses/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${AuthUtils.getToken()}` }
            });
            this.renderAddresses();
        } catch (error) { console.error(error); }
    }
};

// --- MODAL ---
window.toggleModal = function(forceOpen = false) {
    const modal = document.getElementById("address-modal");
    if (forceOpen || modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
        document.getElementById("address-form").reset();
        document.getElementById("address-id").value = "";
        AddressManager.resetSelect("district", "Chọn Quận/Huyện");
        AddressManager.resetSelect("ward", "Chọn Phường/Xã");
    }
};

document.addEventListener("DOMContentLoaded", () => AddressManager.init());