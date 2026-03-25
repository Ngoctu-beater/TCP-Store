package com.service.accountservice.dto;

import lombok.Data;

@Data
public class AddressRequest {
    private String receiverName;
    private String phoneNumber;
    private String provinceCity;
    private String district;
    private String ward;
    private String detailAddress;
    private Boolean isDefault;
}
