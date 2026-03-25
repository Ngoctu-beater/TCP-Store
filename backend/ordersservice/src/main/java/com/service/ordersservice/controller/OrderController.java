package com.service.ordersservice.controller;

import com.service.ordersservice.dto.CategoryRevenueStatResponse;
import com.service.ordersservice.dto.DashboardStatResponse;
import com.service.ordersservice.dto.OrderRequest;
import com.service.ordersservice.dto.RevenueStatResponse;
import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.enums.PaymentStatus;
import com.service.ordersservice.model.Order;
import com.service.ordersservice.service.OrderService;
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
@CrossOrigin(origins = "*")
public class OrderController {
    private final OrderService orderService;
    private final JwtUtil jwtUtil;

    private Integer getUserId(String token) {
        return jwtUtil.extractUserId(token.replace("Bearer ", ""));
    }

    @PostMapping("/create")
    public ResponseEntity<Order> createOrder(
            @RequestHeader("Authorization") String token,
            @RequestBody OrderRequest request) {

        Integer userId = getUserId(token); // Sẽ lấy đúng ID của người đang đăng nhập
        Order savedOrder = orderService.createOrder(userId, request);
        return ResponseEntity.ok(savedOrder);
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

        // Đảm bảo user đã đăng nhập hợp lệ
        Integer userId = getUserId(token);

        Order order = orderService.getOrderByCode(orderCode);

        // Kiểm tra xem đơn hàng này có đúng là của user đang đăng nhập không
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
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        return ResponseEntity.ok(orderService.getAllOrdersForAdmin(keyword, status, page, size));
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
            @RequestParam(value = "days", defaultValue = "7") int days) {
        return ResponseEntity.ok(orderService.getRevenueStatistics(days));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/categories")
    public ResponseEntity<List<CategoryRevenueStatResponse>> getCategoryRevenueStatistics(
            @RequestParam(value = "days", required = false) Integer days,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getCategoryRevenueStatistics(days, date));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/dashboard")
    public ResponseEntity<DashboardStatResponse> getDashboardStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getDashboardStatistics(filter, date));
    }
}
