package com.service.ordersservice.controller;

import com.service.ordersservice.model.Voucher;
import com.service.ordersservice.service.OrderService;
import com.service.ordersservice.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VoucherController {
    private final VoucherService voucherService;
    private final OrderService orderService;

    @GetMapping("/admin/all")
    public ResponseEntity<List<Voucher>> getAll() {
        return ResponseEntity.ok(voucherService.getAllVouchers());
    }

    @PostMapping("/admin/add")
    public ResponseEntity<Voucher> add(@RequestBody Voucher voucher) {
        return ResponseEntity.ok(voucherService.createVoucher(voucher));
    }

    @PutMapping("/admin/update/{id}")
    public ResponseEntity<Voucher> update(@PathVariable Integer id, @RequestBody Voucher voucher) {
        return ResponseEntity.ok(voucherService.updateVoucher(id, voucher));
    }

    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateVoucher(
            @RequestParam("code") String code,
            @RequestParam("subTotal") BigDecimal subTotal) {

        Map<String, Object> result = orderService.validateAndCalculateDiscount(code, subTotal);
        if ((Boolean) result.get("isValid")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @GetMapping("/public/active")
    public ResponseEntity<List<Voucher>> getActiveVouchers() {
        return ResponseEntity.ok(voucherService.getPublicActiveVouchers());
    }
}
