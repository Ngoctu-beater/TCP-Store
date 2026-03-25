package com.service.productservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ProductPageResponse {
    private List<ProductResponse> content; // Danh sách sản phẩm trong trang này
    private int pageNo;         // Số thứ tự trang hiện tại
    private int pageSize;       // Kích thước trang (số lượng item/trang)
    private long totalElements; // Tổng số sản phẩm (của tất cả các trang)
    private int totalPages;     // Tổng số trang
    private boolean last;       // Có phải trang cuối cùng không?
}
