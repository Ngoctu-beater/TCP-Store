package com.service.ordersservice.service;

import com.service.ordersservice.dto.*;
import com.service.ordersservice.enums.DiscountType;
import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.enums.PaymentStatus;
import com.service.ordersservice.model.Order;
import com.service.ordersservice.model.OrderItem;
import com.service.ordersservice.model.Voucher;
import com.service.ordersservice.repository.OrderRepository;
import com.service.ordersservice.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final ProductServiceClient productServiceClient;
    private final VoucherRepository voucherRepository;

    // Khai báo bộ ký tự an toàn
    private static final String ALLOWED_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public Order createOrder(Integer userId, OrderRequest request) {
        // TẠO MÃ ĐƠN HÀNG
        String orderCode = generateOrderCode();

        // Tính toán tổng tiền
        BigDecimal subTotal = BigDecimal.ZERO;
        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            BigDecimal itemTotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            subTotal = subTotal.add(itemTotal);
        }

        // Tính tiền giảm
        BigDecimal discount = BigDecimal.ZERO;
        String voucherCode = request.getVoucherCode();

        if (voucherCode != null && !voucherCode.trim().isEmpty()) {
            Map<String, Object> validationResult = validateAndCalculateDiscount(voucherCode, subTotal);

            if ((Boolean) validationResult.get("isValid")) {
                discount = (BigDecimal) validationResult.get("discountAmount");
                incrementVoucherUsage(voucherCode); // Tăng lượt sử dụng voucher lên 1
            } else {
                // Nếu mã không hợp lệ, không cho tạo đơn
                throw new RuntimeException((String) validationResult.get("message"));
            }
        }

        BigDecimal shipping = request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO;

        // Tính tổng tiền cuối cùng
        BigDecimal calculatedTotal = subTotal.subtract(discount).add(shipping);
        BigDecimal totalAmount = calculatedTotal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : calculatedTotal;

        // Khởi tạo Order
        Order order = Order.builder()
                .userId(userId)
                .orderCode(orderCode)
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .shippingAddress(request.getShippingAddress())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .orderStatus(OrderStatus.PENDING)
                .voucherCode(voucherCode)
                .subTotal(subTotal)
                .discountAmount(discount)
                .shippingFee(shipping)
                .totalAmount(totalAmount)
                .build();

        // Map Order Items
        List<OrderItem> items = request.getItems().stream().map(reqItem -> OrderItem.builder()
                .order(order)
                .productId(reqItem.getProductId())
                .productName(reqItem.getProductName())
                .productThumbnail(reqItem.getProductThumbnail())
                .quantity(reqItem.getQuantity())
                .unitPrice(reqItem.getUnitPrice())
                // Lấy giá vốn, nếu null thì tạm tính bằng 70% giá bán
                .costPrice(reqItem.getCostPrice() != null ? reqItem.getCostPrice() : reqItem.getUnitPrice().multiply(new BigDecimal("0.7")))
                .totalPrice(reqItem.getUnitPrice().multiply(BigDecimal.valueOf(reqItem.getQuantity())))
                .build()
        ).collect(Collectors.toList());

        order.setItems(items);

        List<StockUpdateRequest> stockRequests = request.getItems().stream()
                .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                .collect(Collectors.toList());

        try {
            // Nếu hết hàng, báo lỗi
            productServiceClient.decreaseStock(stockRequests);
        } catch (Exception e) {
            throw new RuntimeException("Rất tiếc! Sản phẩm trong đơn đã hết hàng hoặc không đủ số lượng.");
        }

        return orderRepository.save(order);
    }

    // Xử lý voucher và tính toán
    @Transactional(readOnly = true)
    public Map<String, Object> validateAndCalculateDiscount(String code, BigDecimal orderSubTotal) {
        Map<String, Object> response = new HashMap<>();

        try {
            Voucher voucher = voucherRepository.findByVoucherCodeAndIsActiveTrue(code)
                    .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại hoặc đã bị khóa"));

            LocalDateTime now = LocalDateTime.now();

            if (voucher.getStartDate() != null && now.isBefore(voucher.getStartDate())) {
                throw new RuntimeException("Mã giảm giá chưa tới thời gian sử dụng");
            }
            if (voucher.getEndDate() != null && now.isAfter(voucher.getEndDate())) {
                throw new RuntimeException("Mã giảm giá đã hết hạn");
            }

            int currentUsedCount = voucher.getUsedCount() != null ? voucher.getUsedCount() : 0;
            if (voucher.getUsageLimit() != null && currentUsedCount >= voucher.getUsageLimit()) {
                throw new RuntimeException("Mã giảm giá đã hết lượt sử dụng");
            }

            if (voucher.getMinOrderAmount() != null && orderSubTotal.compareTo(voucher.getMinOrderAmount()) < 0) {
                throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderAmount() + "đ để áp dụng mã này");
            }

            // Tính số tiền được giảm
            BigDecimal discountAmount = BigDecimal.ZERO;

            if (voucher.getDiscountType() == DiscountType.FIXED_AMOUNT) {
                discountAmount = voucher.getDiscountValue();
            } else if (voucher.getDiscountType() == DiscountType.PERCENTAGE) {
                discountAmount = orderSubTotal.multiply(voucher.getDiscountValue()).divide(new BigDecimal("100"));

                // Nếu vượt quá mức giảm tối đa thì gán bằng mức giảm tối đa
                if (voucher.getMaxDiscountAmount() != null && discountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                    discountAmount = voucher.getMaxDiscountAmount();
                }
            }

            // Đảm bảo không giảm giá lố tiền hàng
            if (discountAmount.compareTo(orderSubTotal) > 0) {
                discountAmount = orderSubTotal;
            }

            response.put("isValid", true);
            response.put("discountAmount", discountAmount);
            response.put("voucherCode", voucher.getVoucherCode());
            response.put("message", "Áp dụng mã thành công!");
            return response;

        } catch (Exception e) {
            response.put("isValid", false);
            response.put("discountAmount", BigDecimal.ZERO);
            response.put("message", e.getMessage());
            return response;
        }
    }

    private void incrementVoucherUsage(String code) {
        voucherRepository.findByVoucherCodeAndIsActiveTrue(code).ifPresent(voucher -> {
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        });
    }

    public List<Order> getOrdersByUser(Integer userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // Hàm sinh mã đơn hàng
    private String generateOrderCode() {
        String prefix = "TCPS";

        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));

        StringBuilder randomPart = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            randomPart.append(ALLOWED_CHARACTERS.charAt(RANDOM.nextInt(ALLOWED_CHARACTERS.length())));
        }

        return prefix + "-" + datePart + "-" + randomPart.toString();
    }

    @Transactional(readOnly = true)
    public Order getOrderByCode(String identifier) {
        // Thử tìm theo ID trước
        try {
            Integer id = Integer.parseInt(identifier);
            Optional<Order> orderById = orderRepository.findById(id);
            if (orderById.isPresent()) {
                return orderById.get();
            }
        } catch (NumberFormatException e) {
            // Nếu không phải là số (VD: "TCPS-260219-A7K4"), nó sẽ văng lỗi Parse,
            // ta bỏ qua lỗi này để chạy tiếp xuống hàm tìm theo mã OrderCode bên dưới.
        }

        // Nếu không phải ID, thì tìm theo OrderCode
        return orderRepository.findByOrderCode(identifier)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với thông tin: " + identifier));
    }

    @Transactional
    public Order cancelOrder(String orderCode, Integer userId) {
        Order order = getOrderByCode(orderCode);

        // Kiểm tra xem đơn hàng có đúng của người này không
        if (!order.getUserId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền thao tác với đơn hàng này!");
        }

        // Chỉ cho phép hủy nếu đang ở trạng thái PENDING
        if (order.getOrderStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận!");
        }

        // Đổi trạng thái thành CANCELLED
        order.setOrderStatus(OrderStatus.CANCELLED);
        Order savedOrder = orderRepository.save(order);

        List<StockUpdateRequest> stockRequests = savedOrder.getItems().stream()
                .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                .collect(Collectors.toList());

        productServiceClient.increaseStock(stockRequests);

        return savedOrder;
    }

    @Transactional
    public Order updateOrderStatuses(String orderCode, OrderStatus newStatus, PaymentStatus newPaymentStatus) {
        Order order = getOrderByCode(orderCode);

        if (newStatus != null && order.getOrderStatus() != newStatus) {
            OrderStatus currentStatus = order.getOrderStatus();

            if (currentStatus == OrderStatus.DELIVERED || currentStatus == OrderStatus.CANCELLED) {
                throw new RuntimeException("Đơn hàng đã chốt (Hoàn thành/Đã hủy), không thể thay đổi trạng thái!");
            }

            if (newStatus != OrderStatus.CANCELLED) {
                // Chặn quay ngược
                if (newStatus.ordinal() < currentStatus.ordinal()) {
                    throw new RuntimeException("Lỗi nghiệp vụ: Không thể quay ngược trạng thái đơn hàng!");
                }
                // Chặn nhảy cóc
                if (newStatus.ordinal() > currentStatus.ordinal() + 1) {
                    throw new RuntimeException("Lỗi nghiệp vụ: Không được nhảy cóc trạng thái đơn hàng!");
                }
            }

            if (newStatus == OrderStatus.DELIVERED) {
                List<StockUpdateRequest> soldRequests = order.getItems().stream()
                        .map(item -> StockUpdateRequest.builder()
                                .productId(item.getProductId())
                                .quantity(item.getQuantity())
                                .build())
                        .collect(Collectors.toList());
                try {
                    productServiceClient.increaseSold(soldRequests);
                } catch (Exception e) {
                    System.err.println("Lỗi gọi Product Service: " + e.getMessage());
                }
            }
            order.setOrderStatus(newStatus);
        }

        if (newPaymentStatus != null && order.getPaymentStatus() != newPaymentStatus) {
            PaymentStatus currentPaymentStatus = order.getPaymentStatus();

            if (currentPaymentStatus == PaymentStatus.PAID) {
                throw new RuntimeException("Lỗi nghiệp vụ: Đơn hàng đã ghi nhận thanh toán thành công, không thể quay ngược!");
            }

            if (currentPaymentStatus == PaymentStatus.FAILED && newPaymentStatus == PaymentStatus.PENDING) {
                throw new RuntimeException("Không thể quay ngược từ Thất bại về Chờ thanh toán!");
            }

            order.setPaymentStatus(newPaymentStatus);
        }

        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrdersForAdmin(String keyword, String statusStr, String startDateStr, String endDateStr, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        OrderStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try {
                status = OrderStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }

        // XỬ LÝ NGÀY THÁNG
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;

        if (startDateStr != null && !startDateStr.trim().isEmpty()) {
            // Ép thành đầu ngày 00:00:00
            startDateTime = LocalDate.parse(startDateStr).atStartOfDay();
        }
        if (endDateStr != null && !endDateStr.trim().isEmpty()) {
            // Ép thành cuối ngày 23:59:59
            endDateTime = LocalDate.parse(endDateStr).atTime(23, 59, 59);
        }

        return orderRepository.searchOrdersForAdmin(keyword, status, startDateTime, endDateTime, pageable);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getOrderStatistics() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", orderRepository.count());
        stats.put("pending", orderRepository.countByOrderStatus(OrderStatus.PENDING));
        stats.put("shipping", orderRepository.countByOrderStatus(OrderStatus.SHIPPING));
        stats.put("completed", orderRepository.countByOrderStatus(OrderStatus.DELIVERED));
        return stats;
    }

    @Transactional(readOnly = true)
    public List<RevenueStatResponse> getRevenueStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);
        LocalDateTime startDate = t.currentStart;
        LocalDateTime endDate = t.currentEnd;

        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(startDate) && !o.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());

        Map<String, BigDecimal> dailyRevenue = new HashMap<>();
        Map<String, BigDecimal> dailyProfit = new HashMap<>();
        DateTimeFormatter formatter;

        boolean isSingleDay = (dateStr != null && !dateStr.trim().isEmpty()) || "today".equalsIgnoreCase(filter);
        boolean isYear = "year".equalsIgnoreCase(filter) && !isSingleDay;

        // Tự động điều chỉnh định dạng nhãn trên biểu đồ theo thời gian
        if (isSingleDay) {
            formatter = DateTimeFormatter.ofPattern("HH:00");
        } else if (isYear) {
            formatter = DateTimeFormatter.ofPattern("MM/yyyy");
        } else {
            formatter = DateTimeFormatter.ofPattern("dd/MM");
        }

        for (Order o : orders) {
            String label = o.getCreatedAt().format(formatter);

            BigDecimal currentRev = dailyRevenue.getOrDefault(label, BigDecimal.ZERO);
            dailyRevenue.put(label, currentRev.add(o.getTotalAmount()));

            BigDecimal totalCost = BigDecimal.ZERO;
            for(OrderItem item : o.getItems()) {
                BigDecimal itemCost = item.getCostPrice() != null ? item.getCostPrice() : BigDecimal.ZERO;
                // Nhân giá vốn với số lượng sản phẩm
                totalCost = totalCost.add(itemCost.multiply(BigDecimal.valueOf(item.getQuantity())));
            }

            BigDecimal orderProfit = o.getTotalAmount().subtract(totalCost);
            BigDecimal currentProf = dailyProfit.getOrDefault(label, BigDecimal.ZERO);
            dailyProfit.put(label, currentProf.add(orderProfit));
        }

        List<RevenueStatResponse> response = new ArrayList<>();

        // Tạo các mốc thời gian trống để biểu đồ không bị gãy đoạn nếu có ngày/giờ không có đơn
        if (isSingleDay) {
            for (int i = 0; i <= 23; i++) {
                String label = String.format("%02d:00", i);
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
            }
        } else if (isYear) {
            for (int i = 1; i <= 12; i++) {
                String label = String.format("%02d/%04d", i, startDate.getYear());
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
            }
        } else {
            java.time.LocalDate curr = startDate.toLocalDate();
            java.time.LocalDate end = endDate.toLocalDate();
            while (!curr.isAfter(end)) {
                String label = curr.format(DateTimeFormatter.ofPattern("dd/MM"));
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
                curr = curr.plusDays(1);
            }
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<CategoryRevenueStatResponse> getCategoryRevenueStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);
        LocalDateTime startDate = t.currentStart;
        LocalDateTime endDate = t.currentEnd;

        List<Order> deliveredOrders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(startDate) && !o.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());

        if (deliveredOrders.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> productIds = deliveredOrders.stream()
                .flatMap(order -> order.getItems().stream())
                .map(OrderItem::getProductId)
                .distinct()
                .collect(Collectors.toList());
        List<ProductCategoryInfoResponse> categoryInfos = productServiceClient.getCategoryInfoForProducts(productIds);

        Map<Integer, String> productToCategoryMap = categoryInfos.stream()
                .collect(Collectors.toMap(ProductCategoryInfoResponse::getProductId, ProductCategoryInfoResponse::getCategoryName));

        Map<String, CategoryRevenueStatResponse> statMap = new HashMap<>();

        for (Order order : deliveredOrders) {
            for (OrderItem item : order.getItems()) {
                String catName = productToCategoryMap.getOrDefault(item.getProductId(), "Khác");

                CategoryRevenueStatResponse stat = statMap.getOrDefault(catName,
                        CategoryRevenueStatResponse.builder()
                                .categoryName(catName)
                                .totalSold(0)
                                .totalRevenue(BigDecimal.ZERO)
                                .build());

                stat.setTotalSold(stat.getTotalSold() + item.getQuantity());

                BigDecimal itemRevenue = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                stat.setTotalRevenue(stat.getTotalRevenue().add(itemRevenue));

                statMap.put(catName, stat);
            }
        }

        return statMap.values().stream()
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DashboardStatResponse getDashboardStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);

        List<Order> currentOrders = orderRepository.findAll().stream()
                .filter(o -> !o.getCreatedAt().isBefore(t.currentStart) && !o.getCreatedAt().isAfter(t.currentEnd))
                .collect(Collectors.toList());

        List<Order> prevOrders = orderRepository.findAll().stream()
                .filter(o -> !o.getCreatedAt().isBefore(t.prevStart) && !o.getCreatedAt().isAfter(t.prevEnd))
                .collect(Collectors.toList());

        long totalOrders = currentOrders.size();
        BigDecimal netRevenue = currentOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long cancelled = currentOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED).count();
        double cancelRate = totalOrders == 0 ? 0 : (double) cancelled / totalOrders * 100;

        long prevTotalOrders = prevOrders.size();
        BigDecimal prevNetRevenue = prevOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long prevCancelled = prevOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED).count();
        double prevCancelRate = prevTotalOrders == 0 ? 0 : (double) prevCancelled / prevTotalOrders * 100;

        return DashboardStatResponse.builder()
                .totalOrders(totalOrders)
                .netRevenue(netRevenue)
                .cancelRate(Math.round(cancelRate * 100.0) / 100.0)
                .ordersGrowth(calculateGrowth(totalOrders, prevTotalOrders))
                .revenueGrowth(calculateGrowth(netRevenue.doubleValue(), prevNetRevenue.doubleValue()))
                .cancelRateGrowth(calculateGrowth(cancelRate, prevCancelRate))
                .build();
    }

    private Double calculateGrowth(double current, double prev) {
        if (prev == 0) return current > 0 ? 100.0 : 0.0;
        double growth = ((current - prev) / prev) * 100;
        return Math.round(growth * 10.0) / 10.0;
    }

    private LocalDateTime[] calculateTimeRange(Integer days, String dateStr) {
        LocalDateTime start;
        LocalDateTime end = LocalDateTime.now();

        if (dateStr != null && !dateStr.trim().isEmpty()) {
            LocalDate specificDate = LocalDate.parse(dateStr);
            start = specificDate.atStartOfDay();
            end = specificDate.atTime(23, 59, 59);
        } else {
            start = LocalDateTime.now().minusDays(days != null ? days : 30);
            if (days != null && days == 1) {
                start = LocalDate.now().atStartOfDay();
            }
        }
        return new LocalDateTime[]{start, end};
    }

    public static class TimeComparison {
        public java.time.LocalDateTime currentStart;
        public java.time.LocalDateTime currentEnd;
        public java.time.LocalDateTime prevStart;
        public java.time.LocalDateTime prevEnd;
    }

    private TimeComparison getTimeComparison(String filter, String dateStr) {
        TimeComparison t = new TimeComparison();

        if (dateStr != null && !dateStr.trim().isEmpty()) {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            t.currentStart = date.atStartOfDay();
            t.currentEnd = date.atTime(23, 59, 59);
            t.prevStart = date.minusDays(1).atStartOfDay();
            t.prevEnd = date.minusDays(1).atTime(23, 59, 59);
            return t;
        }

        if (filter == null) filter = "month";
        java.time.LocalDate now = java.time.LocalDate.now();

        switch (filter.toLowerCase()) {
            case "today":
                t.currentStart = now.atStartOfDay();
                t.currentEnd = now.atTime(23, 59, 59);
                t.prevStart = now.minusDays(1).atStartOfDay();
                t.prevEnd = now.minusDays(1).atTime(23, 59, 59);
                break;
            case "week":
                java.time.LocalDate startOfWeek = now.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
                t.currentStart = startOfWeek.atStartOfDay();
                t.currentEnd = startOfWeek.plusDays(6).atTime(23, 59, 59);
                t.prevStart = startOfWeek.minusWeeks(1).atStartOfDay();
                t.prevEnd = startOfWeek.minusWeeks(1).plusDays(6).atTime(23, 59, 59);
                break;
            case "month":
                java.time.LocalDate startOfMonth = now.withDayOfMonth(1);
                java.time.LocalDate endOfMonth = now.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.currentStart = startOfMonth.atStartOfDay();
                t.currentEnd = endOfMonth.atTime(23, 59, 59);

                java.time.LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);
                java.time.LocalDate endOfPrevMonth = endOfMonth.minusMonths(1).with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.prevStart = startOfPrevMonth.atStartOfDay();
                t.prevEnd = endOfPrevMonth.atTime(23, 59, 59);
                break;
            case "year":
                java.time.LocalDate startOfYear = now.withDayOfYear(1);
                java.time.LocalDate endOfYear = now.with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.currentStart = startOfYear.atStartOfDay();
                t.currentEnd = endOfYear.atTime(23, 59, 59);

                java.time.LocalDate startOfPrevYear = startOfYear.minusYears(1);
                java.time.LocalDate endOfPrevYear = endOfYear.minusYears(1).with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.prevStart = startOfPrevYear.atStartOfDay();
                t.prevEnd = endOfPrevYear.atTime(23, 59, 59);
                break;
        }
        return t;
    }

    @Transactional(readOnly = true)
    public Map<String, List<ProductStockResponse>> getInventoryReport() {
        Map<String, List<ProductStockResponse>> report = new HashMap<>();

        // Lấy top 5 sắp hết (tồn ít nhất - asc)
        report.put("lowStock", productServiceClient.getProductsByStock("asc").stream()
                .limit(5)
                .collect(Collectors.toList()));

        // Lấy top 5 tồn nhiều nhất (desc)
        report.put("highStock", productServiceClient.getProductsByStock("desc").stream()
                .limit(5)
                .collect(Collectors.toList()));

        return report;
    }

    // Sản phẩm bán chạy
    @Transactional(readOnly = true)
    public List<TopProductResponse> getTopSellingProducts(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);

        List<Order> deliveredOrders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(t.currentStart) && !o.getCreatedAt().isAfter(t.currentEnd))
                .collect(Collectors.toList());

        Map<Integer, TopProductResponse> productMap = new HashMap<>();

        for (Order order : deliveredOrders) {
            for (OrderItem item : order.getItems()) {
                TopProductResponse stat = productMap.getOrDefault(item.getProductId(),
                        TopProductResponse.builder()
                                .productId(item.getProductId())
                                .productName(item.getProductName())
                                .thumbnail(item.getProductThumbnail())
                                .totalQuantity(0)
                                .totalRevenue(BigDecimal.ZERO)
                                .build());

                stat.setTotalQuantity(stat.getTotalQuantity() + item.getQuantity());
                BigDecimal itemRev = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                stat.setTotalRevenue(stat.getTotalRevenue().add(itemRev));

                productMap.put(item.getProductId(), stat);
            }
        }

        return productMap.values().stream()
                .sorted((a, b) -> b.getTotalQuantity().compareTo(a.getTotalQuantity()))
                .limit(5)
                .collect(Collectors.toList());
    }
}
