package com.service.ordersservice.controller;

import com.service.ordersservice.dto.*;
import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.enums.PaymentStatus;
import com.service.ordersservice.model.Order;
import com.service.ordersservice.service.OrderService;
import com.service.ordersservice.service.PayOSService; // Thêm thư viện PayOSService
import com.service.ordersservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final JwtUtil jwtUtil;

    // Inject PayOSService vào đây
    private final PayOSService payOSService;

    private Integer getUserId(String token) {
        return jwtUtil.extractUserId(token.replace("Bearer ", ""));
    }

    @PostMapping("/create")
    public ResponseEntity<?> createOrder(
            @RequestHeader("Authorization") String token,
            @RequestBody OrderRequest request) {

        try {
            Integer userId = getUserId(token);
            Order savedOrder = orderService.createOrder(userId, request);
            return ResponseEntity.ok(savedOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==========================================
    // TÍCH HỢP PAYOS - API TẠO LINK THANH TOÁN
    // ==========================================
    @PostMapping("/{orderCode}/generate-payos-link")
    public ResponseEntity<?> generatePayosLink(@PathVariable("orderCode") String orderCode) {
        try {
            // Lấy thông tin đơn hàng hiện tại
            Order order = orderService.getOrderByCode(orderCode);

            // Do PayOS bắt buộc orderCode phải là số nguyên, ta dùng ID của đơn hàng
            long numericOrderCode = order.getId();
            long amount = order.getTotalAmount().longValue(); // Tổng tiền cần thanh toán

            // Gọi PayOSService để sinh link
            String paymentLink = payOSService.createPaymentLinkForMicroservice(orderCode, numericOrderCode, amount);

            // Trả về thẳng đường link dưới dạng chữ (String)
            return ResponseEntity.ok(paymentLink);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi sinh link PayOS: " + e.getMessage());
        }
    }

    // ==========================================
    // API XÓA CỨNG ĐƠN HÀNG (KHI HỦY THANH TOÁN)
    // ==========================================
    @DeleteMapping("/{orderCode}")
    public ResponseEntity<?> deleteOrder(@PathVariable("orderCode") String orderCode) {
        try {
            orderService.deleteOrderByCode(orderCode);
            return ResponseEntity.ok("Đã hủy và xóa đơn hàng thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xóa đơn: " + e.getMessage());
        }
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(
            @RequestHeader("Authorization") String token) {

        Integer userId = getUserId(token);
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    @GetMapping("/{orderCode}")
    public ResponseEntity<Order> getOrderByCode(
            @RequestHeader("Authorization") String token,
            @PathVariable("orderCode") String orderCode) {

        Integer userId = getUserId(token);
        Order order = orderService.getOrderByCode(orderCode);

        if (!order.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(order);
    }

    @PutMapping("/{orderCode}/cancel")
    public ResponseEntity<?> cancelOrder(
            @RequestHeader("Authorization") String token,
            @PathVariable("orderCode") String orderCode) {
        try {
            Integer userId = getUserId(token);
            Order cancelledOrder = orderService.cancelOrder(orderCode, userId);
            return ResponseEntity.ok(cancelledOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{orderCode}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("orderCode") String orderCode,
            @RequestParam(value = "status", required = false) OrderStatus status,
            @RequestParam(value = "paymentStatus", required = false) PaymentStatus paymentStatus) {
        try {
            Order updatedOrder = orderService.updateOrderStatuses(orderCode, status, paymentStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<Page<Order>> getAllOrdersAdmin(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "status", defaultValue = "") String status,
            @RequestParam(value = "startDate", defaultValue = "") String startDate,
            @RequestParam(value = "endDate", defaultValue = "") String endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        return ResponseEntity.ok(orderService.getAllOrdersForAdmin(keyword, status, startDate, endDate, page, size));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/{orderCode}")
    public ResponseEntity<Order> getOrderDetailsForAdmin(@PathVariable("orderCode") String orderCode) {
        return ResponseEntity.ok(orderService.getOrderByCode(orderCode));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics")
    public ResponseEntity<Map<String, Long>> getOrderStatistics() {
        return ResponseEntity.ok(orderService.getOrderStatistics());
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/revenue")
    public ResponseEntity<List<RevenueStatResponse>> getRevenueStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getRevenueStatistics(filter, date));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/categories")
    public ResponseEntity<List<CategoryRevenueStatResponse>> getCategoryRevenueStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getCategoryRevenueStatistics(filter, date));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/dashboard")
    public ResponseEntity<DashboardStatResponse> getDashboardStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getDashboardStatistics(filter, date));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/inventory")
    public ResponseEntity<Map<String, List<ProductStockResponse>>> getInventoryReport() {
        return ResponseEntity.ok(orderService.getInventoryReport());
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/top-products")
    public ResponseEntity<List<TopProductResponse>> getTopSellingProducts(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getTopSellingProducts(filter, date));
    }
}