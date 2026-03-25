package com.service.ordersservice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class RevenueStatResponse {
    private String date;
    private BigDecimal revenue;
    private BigDecimal profit;
}
