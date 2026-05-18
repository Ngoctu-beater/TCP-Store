package com.service.ordersservice.controller;

import com.service.ordersservice.enums.PaymentStatus;
import com.service.ordersservice.service.OrderService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequestMapping("/api/payment/payos")
// BỎ @RequiredArgsConstructor để tự viết constructor cho an toàn
public class PayOSController {

    private final OrderService orderService;

    public PayOSController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/return")
    public void handlePaymentReturn(
            @RequestParam(value = "code", required = false) String payosCode,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("stringOrderCode") String stringOrderCode,
            HttpServletResponse response) throws IOException {

        // Kiểm tra mã thành công "00" và status "PAID"
        if ("PAID".equalsIgnoreCase(status) && "00".equals(payosCode)) {
            // Cập nhật trạng thái Database
            orderService.updateOrderStatuses(stringOrderCode, null, PaymentStatus.PAID);

            // Redirect về trang Frontend cổng 5500
            response.sendRedirect("http://127.0.0.1:5500/frontend/payment_success.html?orderCode=" + stringOrderCode);
        } else {
            response.sendRedirect("http://127.0.0.1:5500/frontend/shopping_cart.html?error=failed");
        }
    }

    @GetMapping("/cancel")
    public void handlePaymentCancel(
            @RequestParam("stringOrderCode") String stringOrderCode,
            HttpServletResponse response) throws IOException {

        System.out.println("Đang xử lý hủy đơn hàng: " + stringOrderCode);
        try {
            // Gọi Service để xóa đơn và CỘNG LẠI KHO
            orderService.deleteOrderByCode(stringOrderCode);
            System.out.println("Đã xóa đơn và hoàn kho thành công.");
        } catch (Exception e) {
            System.err.println("Lỗi khi hủy đơn: " + e.getMessage());
        }

        // Đưa khách về giỏ hàng kèm thông báo
        response.sendRedirect("http://127.0.0.1:5500/frontend/shopping_cart.html?status=cancelled");
    }
}