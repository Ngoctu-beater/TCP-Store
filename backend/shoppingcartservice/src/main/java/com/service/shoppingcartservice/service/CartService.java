package com.service.shoppingcartservice.service;

import com.service.shoppingcartservice.dto.AddToCartRequest;
import com.service.shoppingcartservice.dto.CartResponse;
import com.service.shoppingcartservice.integration.ProductClient;
import com.service.shoppingcartservice.model.Cart;
import com.service.shoppingcartservice.model.CartItem;
import com.service.shoppingcartservice.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {
    private final CartRepository cartRepository;
    private final ProductClient productClient;

    @Transactional
    public CartResponse getCart(Integer userId) {
        Cart cart = getOrCreateCart(userId);
        refreshCartPrices(cart); // Cập nhật giá mới nhất từ ProductService
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse addToCart(Integer userId, AddToCartRequest request) {
        Cart cart = getOrCreateCart(userId);
        ProductClient.ProductDTO product = productClient.getProductById(request.getProductId());

        // Tìm sản phẩm trong giỏ dựa theo Product ID và Màu sắc
        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> {
                    boolean sameProduct = item.getProductId().equals(request.getProductId());

                    String dbColor = item.getSelectedColor();
                    String reqColor = request.getSelectedColor();

                    boolean sameColor = false;
                    if (dbColor == null && reqColor == null) {
                        sameColor = true;
                    } else if (dbColor != null && reqColor != null) {
                        sameColor = dbColor.trim().equalsIgnoreCase(reqColor.trim());
                    }

                    return sameProduct && sameColor;
                })
                .findFirst();

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .skuId(product.getSku())
                    .selectedColor(request.getSelectedColor()) // LƯU MÀU RA CỘT RIÊNG
                    .quantity(request.getQuantity())
                    .isSelected(true)
                    .build();
            cart.getItems().add(newItem);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(Integer userId, Integer itemId, Integer quantity, Boolean isSelected) {
        Cart cart = getOrCreateCart(userId);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ hàng"));

        if (quantity != null) {
            if (quantity <= 0) cart.getItems().remove(item);
            else item.setQuantity(quantity);
        }

        if (isSelected != null) {
            item.setIsSelected(isSelected);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse selectAllItems(Integer userId, Boolean isSelected) {
        Cart cart = getOrCreateCart(userId);

        // Duyệt qua tất cả sản phẩm trong giỏ và set lại trạng thái
        for (CartItem item : cart.getItems()) {
            item.setIsSelected(isSelected);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(Integer userId, Integer itemId) {
        Cart cart = getOrCreateCart(userId);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    private Cart getOrCreateCart(Integer userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(Cart.builder().userId(userId).build()));
    }

    // Tính lại tổng tiền dựa trên giá realtime từ ProductService
    private void refreshCartPrices(Cart cart) {
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem item : cart.getItems()) {
            if (Boolean.TRUE.equals(item.getIsSelected())) {
                // Gọi sang Product Service lấy giá hiện tại
                ProductClient.ProductDTO product = productClient.getProductById(item.getProductId());
                BigDecimal lineTotal = product.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                total = total.add(lineTotal);
            }
        }
        cart.setTotalAmount(total);
    }

    private CartResponse mapToResponse(Cart cart) {
        List<CartResponse.CartItemDTO> items = cart.getItems().stream().map(item -> {
            ProductClient.ProductDTO product = productClient.getProductById(item.getProductId());

            // LẤY MÀU TỪ CỘT MỚI
            String colorFromCart = item.getSelectedColor();
            String finalImage = product.getThumbnail();
            String displayColorName = null;

            if (product.getColors() != null && !product.getColors().isEmpty() && colorFromCart != null) {
                for (ProductClient.ColorDTO color : product.getColors()) {
                    if (color.getColorName() != null &&
                            color.getColorName().trim().equalsIgnoreCase(colorFromCart.trim())) {

                        if (color.getColorImageUrl() != null && !color.getColorImageUrl().isEmpty()) {
                            finalImage = color.getColorImageUrl();
                        }
                        displayColorName = color.getColorName();
                        break;
                    }
                }
            }

            return CartResponse.CartItemDTO.builder()
                    .id(item.getId())
                    .productId(item.getProductId())
                    .productName(product.getName())
                    .productThumbnail(finalImage)
                    .price(product.getSalePrice())
                    .basePrice(product.getBasePrice())
                    .quantity(item.getQuantity())
                    .subTotal(product.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .isSelected(item.getIsSelected())
                    .stock(product.getStock())

                    // TRẢ VỀ ĐÚNG MÃ SKU ĐÃ LƯU
                    .skuId(item.getSkuId() != null ? item.getSkuId() : product.getSku())

                    .selectedColor(displayColorName)
                    .build();
        }).collect(Collectors.toList());

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .totalAmount(cart.getTotalAmount())
                .totalItems(items.size())
                .items(items)
                .build();
    }
}
