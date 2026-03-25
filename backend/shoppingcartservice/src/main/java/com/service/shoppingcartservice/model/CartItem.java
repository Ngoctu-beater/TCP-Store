package com.service.shoppingcartservice.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "cart_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id")
    @JsonIgnore
    private Cart cart;

    @Column(name = "product_id")
    private Integer productId; // Chỉ lưu ID, không map @ManyToOne trực tiếp

    @Column(name = "sku_id")
    private String skuId;

    @Column(name = "selected_color")
    private String selectedColor;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "is_selected")
    private Boolean isSelected = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
