package com.service.ordersservice.repository;

import com.service.ordersservice.model.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Integer> {
    Optional<Voucher> findByVoucherCode(String voucherCode);
    Optional<Voucher> findByVoucherCodeAndIsActiveTrue(String voucherCode);
    List<Voucher> findByIsActiveTrue();
}
