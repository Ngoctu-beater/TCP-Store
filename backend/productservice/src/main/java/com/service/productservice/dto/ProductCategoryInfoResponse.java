package com.service.productservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductCategoryInfoResponse {
    private Integer productId;
    private Integer categoryId;
    private String categoryName;
}
