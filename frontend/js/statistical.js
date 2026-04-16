let currentFilterQuery = "?days=30";

document.addEventListener("DOMContentLoaded", function () {
  initFilterLogic();
  reloadAllStats();
});

function reloadAllStats() {
  renderDashboardStats(currentFilterQuery);
  renderRevenueChart(currentFilterQuery);
  renderCategoryChart(currentFilterQuery);
}

async function renderRevenueChart(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;

  try {
    const apiUrl = `${AppConfig.ORDER_API_URL}/orders/admin/statistics/revenue${queryStr}`;

    // Lấy token để xác thực Admin
    const token = AuthUtils.getToken();

    // Gọi API
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Lỗi khi lấy dữ liệu thống kê từ server.");
    }

    const data = await response.json();

    // Bóc tách dữ liệu
    const labels = data.map((item) => item.date);
    const revenueData = data.map((item) => item.revenue);
    const profitData = data.map((item) => item.profit);

    // Vẽ biểu đồ
    const canvas = document.getElementById("revenueChart");
    if (!canvas) return;
    let existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const ctx = canvas.getContext("2d");

    let revenueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    revenueGradient.addColorStop(0, "rgba(29, 127, 226, 0.2)");
    revenueGradient.addColorStop(1, "rgba(29, 127, 226, 0)");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Doanh thu",
            data: revenueData,
            borderColor: "#1d7fe2",
            backgroundColor: revenueGradient,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#1d7fe2",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
          },
          {
            label: "Lợi nhuận",
            data: profitData,
            borderColor: "#22c55e",
            borderWidth: 3,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            pointBackgroundColor: "#22c55e",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                let value = context.raw || 0;
                return `${context.dataset.label}: ${UIUtils.formatCurrency(value)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#f0f2f4" },
            ticks: {
              // Định dạng số hiển thị ở trục Y
              callback: function (value) {
                if (value >= 1000000) {
                  return value / 1000000 + " Tr";
                } else if (value >= 1000) {
                  return value / 1000 + " K";
                }
                return value;
              },
            },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
  } catch (error) {
    console.error("Lỗi vẽ biểu đồ:", error);
  }
}

async function renderCategoryChart(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;

  try {
    const apiUrl = `${AppConfig.ORDER_API_URL}/orders/admin/statistics/categories${queryStr}`;
    const token = AuthUtils.getToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Lỗi khi lấy dữ liệu cơ cấu doanh thu");
    const data = await response.json();

    // Chỉ lấy những danh mục có doanh thu > 0
    const validData = data.filter((item) => item.totalRevenue > 0);

    // LẤY CANVAS VÀ XÓA BIỂU ĐỒ CŨ NGAY TỪ ĐẦU
    const canvas = document.getElementById("categoryChart");
    if (canvas) {
      let existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy(); // Hủy biểu đồ cũ khỏi bộ nhớ
      }
    }

    // XỬ LÝ NẾU KHÔNG CÓ DỮ LIỆU
    if (validData.length === 0) {
      document.getElementById("category-legend").innerHTML =
        '<p class="text-center text-sm text-gray-500">Chưa có dữ liệu</p>';

      // Reset số tiền ở giữa tâm vòng tròn về 0đ
      const totalLabel = document.getElementById("total-revenue-label");
      if (totalLabel) totalLabel.innerText = "0 ₫";

      return;
    }

    // NẾU CÓ DỮ LIỆU THÌ TIẾP TỤC VẼ BIỂU ĐỒ
    // Bóc tách dữ liệu
    const labels = validData.map((item) => item.categoryName);
    const revenues = validData.map((item) => item.totalRevenue);

    // Tính toán tổng doanh thu hiển thị ở tâm biểu đồ
    const totalRevenue = revenues.reduce((sum, val) => sum + val, 0);
    document.getElementById("total-revenue-label").innerText =
      UIUtils.formatCurrency(totalRevenue);

    const colors = [
      "#1d7fe2",
      "#a855f7",
      "#f97316",
      "#22c55e",
      "#ef4444",
      "#eab308",
      "#06b6d4",
      "#ec4899",
    ];

    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: revenues,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let value = context.raw || 0;
                let percentage =
                  ((value / totalRevenue) * 100).toFixed(1) + "%";
                return ` ${context.label}: ${UIUtils.formatCurrency(value)} (${percentage})`;
              },
            },
          },
        },
      },
    });

    // Tự động sinh danh sách chú giải bên cạnh biểu đồ
    const legendContainer = document.getElementById("category-legend");
    let legendHtml = "";
    validData.forEach((item, index) => {
      const percentage = ((item.totalRevenue / totalRevenue) * 100).toFixed(1);
      legendHtml += `
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="size-3 rounded-full" style="background-color: ${colors[index % colors.length]}"></span>
                    <span class="text-sm font-medium text-[#111417]">${item.categoryName}</span>
                  </div>
                  <span class="text-sm font-bold text-[#637588]">${percentage}%</span>
                </div>
            `;
    });
    legendContainer.innerHTML = legendHtml;
  } catch (error) {
    console.error("Lỗi vẽ biểu đồ cơ cấu doanh thu:", error);
  }
}

async function renderDashboardStats(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;

  try {
    const apiUrl = `${AppConfig.ORDER_API_URL}/orders/admin/statistics/dashboard${queryStr}`;
    const token = AuthUtils.getToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Không thể lấy dữ liệu tổng quan");
    const data = await response.json();

    // Tổng đơn hàng
    const totalOrdersEl = document.getElementById("stat-total-orders");
    if (totalOrdersEl) {
      totalOrdersEl.innerText = data.totalOrders.toLocaleString("vi-VN");
    }
    updateGrowthUI("stat-total-orders-growth", data.ordersGrowth);

    // Doanh thu thuần
    const netRevenueEl = document.getElementById("stat-net-revenue");
    if (netRevenueEl) {
      let revenue = data.netRevenue;
      let displayRevenue = UIUtils.formatCurrency(revenue);

      if (revenue >= 1000000) {
        displayRevenue = (revenue / 1000000).toFixed(1) + "M ₫";
      }
      netRevenueEl.innerText = displayRevenue;
    }
    updateGrowthUI("stat-net-revenue-growth", data.revenueGrowth);

    // Tỷ lệ hủy đơn
    const cancelRateEl = document.getElementById("stat-cancel-rate");
    if (cancelRateEl) {
      const rate =
        data.cancellationRate !== undefined
          ? data.cancellationRate
          : data.cancelRate;
      cancelRateEl.innerText = rate + "%";
    }
    updateGrowthUI("stat-cancel-rate-growth", data.cancelRateGrowth);

    // Người dùng mới
    try {
      const userRes = await fetch(
        `${AppConfig.BASE_URL}/users/admin/statistics/new-users${queryStr}`,
        {
          headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
        },
      );
      const userData = await userRes.json();
      document.getElementById("stat-new-users").innerText =
        userData.newUsers.toLocaleString();
      updateGrowthUI("stat-new-users-growth", userData.growth);
    } catch (e) {
      console.error("Lỗi tải thống kê người dùng:", e);
    }
  } catch (error) {
    console.error("Lỗi khi tải thông số tổng quan:", error);
  }
}
function initFilterLogic() {
  const buttons = document.querySelectorAll(".filter-btn");
  const dateInput = document.getElementById("filter-date");

  // Lấy chuỗi ngày hôm nay theo định dạng YYYY-MM-DD
  const todayString = new Date().toISOString().split("T")[0];

  if (dateInput) {
    // Mặc định gán ngày hôm nay cho ô input
    dateInput.value = todayString;

    // CHẶN CHỌN NGÀY TƯƠNG LAI BẰNG THUỘC TÍNH MAX
    dateInput.setAttribute("max", todayString);
  }

  // Lắng nghe sự kiện click các nút
  buttons.forEach((btn) => {
    btn.addEventListener("click", function () {
      buttons.forEach((b) => {
        b.classList.remove("bg-primary", "text-white", "shadow-sm");
        b.classList.add("bg-[#f0f2f4]", "text-[#637588]");
      });
      this.classList.remove("bg-[#f0f2f4]", "text-[#637588]");
      this.classList.add("bg-primary", "text-white", "shadow-sm");
      if (dateInput)
        dateInput.classList.remove("ring-2", "ring-primary", "border-primary");

      // Query dựa theo nút
      const filter = this.getAttribute("data-filter");
      if (filter === "today") currentFilterQuery = "?filter=today";
      if (filter === "week") currentFilterQuery = "?filter=week";
      if (filter === "month") currentFilterQuery = "?filter=month";
      if (filter === "year") currentFilterQuery = "?filter=year";

      // Gọi API tải lại dữ liệu
      reloadAllStats();
    });
  });

  // Lắng nghe sự kiện chọn Ngày tùy chỉnh
  if (dateInput) {
    dateInput.addEventListener("change", function () {
      buttons.forEach((b) => {
        b.classList.remove("bg-primary", "text-white", "shadow-sm");
        b.classList.add("bg-[#f0f2f4]", "text-[#637588]");
      });
      this.classList.add("ring-2", "ring-primary", "border-primary");

      // Lấy giá trị ngày và tạo chuỗi Query
      const selectedDate = this.value;
      if (selectedDate) {
        currentFilterQuery = `?date=${selectedDate}`;
        reloadAllStats();
      }
    });
  }
}

function updateGrowthUI(elementId, growthValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.classList.remove(
    "text-green-600",
    "bg-green-50",
    "text-red-600",
    "bg-red-50",
    "text-gray-600",
    "bg-gray-100",
  );

  if (growthValue > 0) {
    el.classList.add("text-green-600", "bg-green-50");
    el.innerText = `+${growthValue}%`;
  } else if (growthValue < 0) {
    el.classList.add("text-red-600", "bg-red-50");
    el.innerText = `${growthValue}%`;
  } else {
    el.classList.add("text-gray-600", "bg-gray-100");
    el.innerText = "0%";
  }
}
