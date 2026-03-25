// Thống kê doanh thu theo danh mục
package com.service.ordersservice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class CategoryRevenueStatResponse {
    private String categoryName;
    private long totalSold;
    private BigDecimal totalRevenue;
}
