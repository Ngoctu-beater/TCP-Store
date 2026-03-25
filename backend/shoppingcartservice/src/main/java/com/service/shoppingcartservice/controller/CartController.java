package com.service.shoppingcartservice.controller;

import com.service.shoppingcartservice.dto.AddToCartRequest;
import com.service.shoppingcartservice.dto.CartResponse;
import com.service.shoppingcartservice.service.CartService;
import com.service.shoppingcartservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CartController {
    private final CartService cartService;
    private final JwtUtil jwtUtil;

    private Integer getUserId(String token) {
        return jwtUtil.extractUserId(token);
    }

    // Xem giỏ hàng
    @GetMapping
    public ResponseEntity<CartResponse> getCart(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(cartService.getCart(getUserId(token)));
    }

    // Thêm vào giỏ
    @PostMapping("/add")
    public ResponseEntity<CartResponse> addToCart(
            @RequestHeader("Authorization") String token,
            @RequestBody AddToCartRequest request
    ) {
        return ResponseEntity.ok(cartService.addToCart(getUserId(token), request));
    }

    // 3. Cập nhật (Tăng giảm số lượng / Chọn mua)
    @PutMapping("/item/{itemId}")
    public ResponseEntity<CartResponse> updateItem(
            @RequestHeader("Authorization") String token,
            @PathVariable("itemId") Integer itemId, // <--- THÊM ("itemId") VÀO ĐÂY
            @RequestParam(value = "quantity", required = false) Integer quantity, // <--- THÊM value = "quantity"
            @RequestParam(value = "isSelected", required = false) Boolean isSelected // <--- THÊM value = "isSelected"
    ) {
        return ResponseEntity.ok(cartService.updateItem(getUserId(token), itemId, quantity, isSelected));
    }

    // 4. Xóa khỏi giỏ
    @DeleteMapping("/item/{itemId}")
    public ResponseEntity<CartResponse> removeItem(
            @RequestHeader("Authorization") String token,
            @PathVariable("itemId") Integer itemId // <--- THÊM ("itemId") VÀO ĐÂY
    ) {
        return ResponseEntity.ok(cartService.removeItem(getUserId(token), itemId));
    }

    @PutMapping("/select-all")
    public ResponseEntity<CartResponse> selectAllItems(
            @RequestHeader("Authorization") String token,
            @RequestParam("isSelected") Boolean isSelected
    ) {
        return ResponseEntity.ok(cartService.selectAllItems(getUserId(token), isSelected));
    }
}
