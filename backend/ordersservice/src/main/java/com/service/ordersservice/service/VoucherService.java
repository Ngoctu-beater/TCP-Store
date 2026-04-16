package com.service.ordersservice.service;

import com.service.ordersservice.model.Voucher;
import com.service.ordersservice.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VoucherService {
    @Autowired
    private VoucherRepository voucherRepository;

    public List<Voucher> getAllVouchers() {
        return voucherRepository.findAll();
    }

    public Voucher createVoucher(Voucher voucher) {
        if(voucherRepository.findByVoucherCode(voucher.getVoucherCode()).isPresent()){
            throw new RuntimeException("Mã voucher đã tồn tại!");
        }
        return voucherRepository.save(voucher);
    }

    public Voucher updateVoucher(Integer id, Voucher details) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Voucher"));

        voucher.setVoucherCode(details.getVoucherCode());
        voucher.setDiscountType(details.getDiscountType());
        voucher.setDiscountValue(details.getDiscountValue());
        voucher.setMinOrderAmount(details.getMinOrderAmount());
        voucher.setMaxDiscountAmount(details.getMaxDiscountAmount());
        voucher.setUsageLimit(details.getUsageLimit());
        voucher.setStartDate(details.getStartDate());
        voucher.setEndDate(details.getEndDate());
        voucher.setActive(details.isActive());

        return voucherRepository.save(voucher);
    }

    public void deleteVoucher(Integer id) {
        voucherRepository.deleteById(id);
    }

    public List<Voucher> getPublicActiveVouchers() {
        return voucherRepository.findByIsActiveTrue();
    }
}
