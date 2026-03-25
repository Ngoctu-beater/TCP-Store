package com.service.productservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CategoryTreeResponse {
    private Integer id;
    private String name;

    // Thuộc tính này sẽ chứa danh sách các danh mục con
    // @JsonInclude để không hiện field này nếu danh sách rỗng
    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private List<CategoryTreeResponse> children;
}
