package com.service.ordersservice.service;

import com.service.ordersservice.dto.*;
import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.enums.PaymentStatus;
import com.service.ordersservice.model.Order;
import com.service.ordersservice.model.OrderItem;
import com.service.ordersservice.repository.OrderRepository;
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

    // Khai báo bộ ký tự an toàn (Loại bỏ O, 0, I, 1)
    private static final String ALLOWED_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public Order createOrder(Integer userId, OrderRequest request) {
        // TẠO MÁ ĐƠN HÀNG
        String orderCode = generateOrderCode();

        // Tính toán tổng tiền
        BigDecimal subTotal = BigDecimal.ZERO;
        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            BigDecimal itemTotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            subTotal = subTotal.add(itemTotal);
        }

        BigDecimal discount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal shipping = request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO;
        BigDecimal totalAmount = subTotal.subtract(discount).add(shipping);

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
                .voucherCode(request.getVoucherCode())
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
                .totalPrice(reqItem.getUnitPrice().multiply(BigDecimal.valueOf(reqItem.getQuantity())))
                .build()
        ).collect(Collectors.toList());

        order.setItems(items);

        // Lưu vào database
        return orderRepository.save(order);
    }

    public List<Order> getOrdersByUser(Integer userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // --- Hàm sinh mã đơn hàng ---
    private String generateOrderCode() {
        // Prefix
        String prefix = "TCPS";

        // Date part: YYMMDD
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));

        // Random part: 4 ký tự an toàn
        StringBuilder randomPart = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            randomPart.append(ALLOWED_CHARACTERS.charAt(RANDOM.nextInt(ALLOWED_CHARACTERS.length())));
        }

        // Combine: TCPS-260219-A7K4
        return prefix + "-" + datePart + "-" + randomPart.toString();
    }

    @Transactional(readOnly = true)
    public Order getOrderByCode(String identifier) {
        // Thử tìm theo ID trước (nếu identifier truyền vào là một con số như "7")
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

            if (newStatus != OrderStatus.CANCELLED && newStatus.ordinal() < currentStatus.ordinal()) {
                throw new RuntimeException("Lỗi nghiệp vụ: Không thể quay ngược trạng thái đơn hàng!");
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
    public Page<Order> getAllOrdersForAdmin(String keyword, String statusStr, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        OrderStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try {
                status = OrderStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }

        return orderRepository.searchOrdersForAdmin(keyword, status, pageable);
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
    public List<RevenueStatResponse> getRevenueStatistics(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);

        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> o.getCreatedAt().isAfter(startDate))
                .collect(Collectors.toList());

        Map<String, BigDecimal> dailyRevenue = new HashMap<>();
        Map<String, BigDecimal> dailyProfit = new HashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

        for (Order o : orders) {
            String dateStr = o.getCreatedAt().format(formatter);

            BigDecimal currentRev = dailyRevenue.getOrDefault(dateStr, BigDecimal.ZERO);
            dailyRevenue.put(dateStr, currentRev.add(o.getTotalAmount()));

            BigDecimal totalCost = BigDecimal.ZERO;
            for(OrderItem item : o.getItems()) {
                BigDecimal itemCost = item.getCostPrice() != null ? item.getCostPrice() : BigDecimal.ZERO;

                totalCost = totalCost.add(itemCost);
            }

            BigDecimal orderProfit = o.getTotalAmount().subtract(totalCost);

            BigDecimal currentProf = dailyProfit.getOrDefault(dateStr, BigDecimal.ZERO);
            dailyProfit.put(dateStr, currentProf.add(orderProfit));
        }

        List<RevenueStatResponse> response = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            String dateStr = LocalDateTime.now().minusDays(i).format(formatter);

            response.add(RevenueStatResponse.builder()
                    .date(dateStr)
                    .revenue(dailyRevenue.getOrDefault(dateStr, BigDecimal.ZERO))
                    .profit(dailyProfit.getOrDefault(dateStr, BigDecimal.ZERO))
                    .build());
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<CategoryRevenueStatResponse> getCategoryRevenueStatistics(Integer days, String dateStr) {
        LocalDateTime[] timeRange = calculateTimeRange(days, dateStr);
        LocalDateTime startDate = timeRange[0];
        LocalDateTime endDate = timeRange[1];

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
}
