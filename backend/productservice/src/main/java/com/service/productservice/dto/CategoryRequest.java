package com.service.productservice.dto;

import lombok.Data;

@Data
public class CategoryRequest {
    private String name;
    private Boolean isFeatured;
    private String displayConfig;
    private Integer parentId;
}
