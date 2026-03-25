package com.service.productservice.controller;

import com.service.productservice.dto.*;
import com.service.productservice.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ProductPageResponse> getProductsByCategory(
            @PathVariable("categoryId") Integer categoryId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestParam(value = "sortBy", defaultValue = "id") String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "desc") String sortDir
    ) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId, page, limit, sortBy, sortDir));
    }

    @PutMapping("/stock/decrease")
    public ResponseEntity<?> decreaseStock(@RequestBody List<StockUpdateRequest> payload) {
        try {
            productService.decreaseStock(payload);
            return ResponseEntity.ok("Đã trừ tồn kho thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/stock/increase")
    public ResponseEntity<?> increaseStock(@RequestBody List<StockUpdateRequest> payload) {
        productService.increaseStock(payload);
        return ResponseEntity.ok("Đã hoàn lại tồn kho thành công!");
    }

    @PutMapping("/sold/increase")
    public ResponseEntity<?> increaseSold(@RequestBody List<StockUpdateRequest> payload) {
        productService.increaseSold(payload);
        return ResponseEntity.ok("Đã cập nhật số lượng bán thành công!");
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/all")
    public ResponseEntity<ProductPageResponse> getAllProductsAdmin(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "categoryId", required = false) Integer categoryId,
            @RequestParam(value = "status", defaultValue = "") String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        return ResponseEntity.ok(productService.getAllProductsForAdmin(keyword, categoryId, status, page, size));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PostMapping("/admin")
    public ResponseEntity<?> createProduct(@RequestBody ProductRequest request) {
        try {
            return ResponseEntity.ok(productService.createProduct(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable("id") Integer id, @RequestBody ProductRequest request) {
        try {
            return ResponseEntity.ok(productService.updateProduct(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable("id") Integer id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok("Đã xóa sản phẩm thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/categories")
    public ResponseEntity<?> getCategoryStatistics() {
        try {
            return ResponseEntity.ok(productService.getCategoryStatistics());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi thống kê: " + e.getMessage());
        }
    }

    @PostMapping("/internal/category-info")
    public ResponseEntity<List<ProductCategoryInfoResponse>> getCategoryInfoForProducts(@RequestBody List<Integer> productIds) {
        return ResponseEntity.ok(productService.getCategoryInfoForProducts(productIds));
    }

    @GetMapping("/search")
    public ResponseEntity<ProductPageResponse> searchPublicProducts(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "limit", defaultValue = "12") int limit,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "desc") String sortDir
    ) {
        return ResponseEntity.ok(productService.searchPublicProducts(keyword, page, limit, sortBy, sortDir));
    }
}
