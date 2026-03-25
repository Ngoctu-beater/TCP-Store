package com.service.accountservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminResponse {
    private Integer userId;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatar;
    private Integer gender;
    private java.time.LocalDate birthDate;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
