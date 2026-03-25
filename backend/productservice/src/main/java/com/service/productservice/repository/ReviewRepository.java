package com.service.productservice.repository;

import com.service.productservice.model.Review;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {
    // Kiểm tra chống đánh giá trùng lặp
    boolean existsByUserIdAndProductIdAndOrderId(Integer userId, Integer productId, Integer orderId);
    List<Review> findByProductIdOrderByCreatedAtDesc(Integer productId);

    @Modifying
    @Query("UPDATE Review r SET r.reviewerName = :name, r.reviewerAvatar = :avatar WHERE r.userId = :userId")
    void syncUserInfo(@Param("userId") Integer userId, @Param("name") String name, @Param("avatar") String avatar);
}
