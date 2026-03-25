package com.service.accountservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressResponse {
    private Integer addressId;
    private String receiverName;
    private String phoneNumber;
    private String provinceCity;
    private String district;
    private String ward;
    private String detailAddress;
    private Boolean isDefault;
}
