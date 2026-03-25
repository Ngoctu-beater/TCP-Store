package com.service.productservice.service;

import com.service.productservice.dto.ReviewRequest;
import com.service.productservice.model.Review;
import com.service.productservice.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviewRepository;

    @Transactional
    public Review addReview(Integer userId, Integer productId, ReviewRequest request) {

        // Kiểm tra xem người này đã đánh giá món hàng này trong đơn này chưa
        if (reviewRepository.existsByUserIdAndProductIdAndOrderId(userId, productId, request.getOrderId())) {
            throw new RuntimeException("Bạn đã đánh giá sản phẩm này rồi!");
        }

        // Validate dữ liệu cơ bản
        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Số sao đánh giá không hợp lệ!");
        }

        // Tạo và lưu Review
        Review review = Review.builder()
                .userId(userId)
                .productId(productId)
                .orderId(request.getOrderId())
                .rating(request.getRating())
                .comment(request.getComment())
                .reviewerName(request.getReviewerName())
                .reviewerAvatar(request.getReviewerAvatar())
                .build();

        return reviewRepository.save(review);
    }

    public List<Review> getProductReviews(Integer productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    @Transactional
    public void syncUserInfo(Integer userId, String name, String avatar) {
        reviewRepository.syncUserInfo(userId, name, avatar);
    }
}
