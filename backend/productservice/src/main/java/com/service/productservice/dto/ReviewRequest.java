package com.service.productservice.dto;

import lombok.Data;

@Data
public class ReviewRequest {
    private Integer orderId;
    private Integer rating;
    private String comment;
    private String reviewerName;
    private String reviewerAvatar;
}
