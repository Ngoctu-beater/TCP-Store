package com.service.ordersservice.service;

import com.service.ordersservice.enums.DiscountType;
import com.service.ordersservice.model.Voucher;
import com.service.ordersservice.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VoucherService {
    @Autowired
    private VoucherRepository voucherRepository;

    public Page<Voucher> getAllVouchers(String keyword, String typeStr, Boolean isActive, int page, int size) {
        DiscountType type = null;
        if (typeStr != null && !typeStr.trim().isEmpty()) {
            try {
                type = DiscountType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }

        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        // Tạo đối tượng phân trang, sắp xếp theo ngày tạo giảm dần
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        return voucherRepository.searchVouchersForAdmin(kw, type, isActive, pageable);
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
