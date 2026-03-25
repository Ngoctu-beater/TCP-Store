package com.service.accountservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserStatResponse {
    private long newUsers;
    private Double growth;
}
