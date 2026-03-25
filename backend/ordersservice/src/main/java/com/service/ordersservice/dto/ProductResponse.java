package com.service.ordersservice.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductResponse {
    private Integer id;
    private String name;
    private BigDecimal salePrice;
    private BigDecimal costPrice;
}
