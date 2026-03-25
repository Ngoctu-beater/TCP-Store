package com.service.productservice.dto;

import lombok.Data;

@Data
public class StockUpdateRequest {
    private Integer productId;
    private Integer quantity;
}
