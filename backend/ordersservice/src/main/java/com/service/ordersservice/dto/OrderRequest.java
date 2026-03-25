package com.service.ordersservice.dto;

import com.service.ordersservice.enums.PaymentMethod;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class OrderRequest {
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private PaymentMethod paymentMethod;
    private String voucherCode;
    private BigDecimal shippingFee;
    private BigDecimal discountAmount;

    // Danh sách sản phẩm mua
    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Integer productId;
        private String productName;
        private String productThumbnail;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}
