package com.service.shoppingcartservice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class ProductSummary {
    private Integer id;
    private String name;
    private String thumbnail;
    private BigDecimal price;
}
