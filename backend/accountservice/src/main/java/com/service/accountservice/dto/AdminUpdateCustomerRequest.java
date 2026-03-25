package com.service.accountservice.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class AdminUpdateCustomerRequest {
    private String fullName;
    private String email;
    private String phoneNumber;
    private Integer gender;
    private LocalDate birthDate;
    private String avatar;
}
