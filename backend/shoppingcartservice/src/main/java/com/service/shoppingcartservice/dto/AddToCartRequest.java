package com.service.shoppingcartservice.dto;

import lombok.Data;

@Data
public class AddToCartRequest {
    private Integer productId;
    private String selectedColor;
    private Integer quantity;
}
