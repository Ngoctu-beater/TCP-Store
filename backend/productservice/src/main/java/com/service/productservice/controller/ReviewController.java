package com.service.productservice.controller;

import com.service.productservice.dto.ReviewRequest;
import com.service.productservice.model.Review;
import com.service.productservice.service.ReviewService;
import com.service.productservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReviewController {
    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    @PostMapping("/{productId}/reviews")
    public ResponseEntity<?> createReview(
            @RequestHeader("Authorization") String token,
            @PathVariable("productId") Integer productId,
            @RequestBody ReviewRequest request) {
        try {
            Integer userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));

            Review savedReview = reviewService.addReview(userId, productId, request);

            return ResponseEntity.ok(savedReview);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{productId}/reviews")
    public ResponseEntity<List<Review>> getProductReviews(@PathVariable("productId") Integer productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId));
    }

    @PutMapping("/reviews/sync")
    public ResponseEntity<?> syncUserReviews(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> payload) {
        try {
            Integer userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            String newName = payload.get("fullName");
            String newAvatar = payload.get("avatar");

            reviewService.syncUserInfo(userId, newName, newAvatar);

            return ResponseEntity.ok("Đồng bộ thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi đồng bộ: " + e.getMessage());
        }
    }
}
