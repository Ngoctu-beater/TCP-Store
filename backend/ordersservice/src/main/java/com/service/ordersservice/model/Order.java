package com.service.ordersservice.model;

import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.enums.PaymentMethod;
import com.service.ordersservice.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "order_code", length = 20, unique = true)
    @JsonProperty("orderCode")
    private String orderCode;

    @Column(name = "receiver_name", length = 100)
    private String receiverName;

    @Column(name = "receiver_phone", length = 20)
    private String receiverPhone;

    @Column(name = "shipping_address", length = 255)
    private String shippingAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status")
    private OrderStatus orderStatus;

    @Column(name = "voucher_code", length = 50)
    private String voucherCode;

    @Column(name = "sub_total", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal subTotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "shipping_fee", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void calculateTotalAmount() {
        BigDecimal currentSubTotal = this.subTotal != null ? this.subTotal : BigDecimal.ZERO;
        BigDecimal currentDiscount = this.discountAmount != null ? this.discountAmount : BigDecimal.ZERO;
        BigDecimal currentShipping = this.shippingFee != null ? this.shippingFee : BigDecimal.ZERO;

        BigDecimal calculatedTotal = currentSubTotal.subtract(currentDiscount).add(currentShipping);
        this.totalAmount = calculatedTotal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : calculatedTotal;
    }
}
