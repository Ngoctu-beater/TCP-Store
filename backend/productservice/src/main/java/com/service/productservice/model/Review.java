package com.service.productservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "reviewer_name")
    private String reviewerName;

    @Column(name = "reviewer_avatar", length = 500)
    private String reviewerAvatar;

    @Column(name = "order_id", nullable = false)
    private Integer orderId;

    @Column(nullable = false)
    private Integer rating; // Số sao (1-5)

    @Column(length = 1000)
    private String comment; // Nội dung đánh giá

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
