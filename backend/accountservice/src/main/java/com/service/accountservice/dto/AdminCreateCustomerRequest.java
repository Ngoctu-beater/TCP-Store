package com.service.accountservice.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class AdminCreateCustomerRequest {
    private String fullName;
    private String email;
    private String phoneNumber;
    private String password;
    private Integer gender;
    private LocalDate birthDate;
    private String avatar;
}
