package com.service.ordersservice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class DashboardStatResponse {
    private long totalOrders;
    private BigDecimal netRevenue;
    private double cancelRate;
    private Double ordersGrowth;
    private Double revenueGrowth;
    private Double cancelRateGrowth;
}
