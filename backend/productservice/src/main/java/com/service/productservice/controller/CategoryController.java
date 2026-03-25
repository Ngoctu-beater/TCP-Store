package com.service.productservice.controller;

import com.service.productservice.dto.CategoryRequest;
import com.service.productservice.dto.CategoryTreeResponse;
import com.service.productservice.model.Category;
import com.service.productservice.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getCategoryById(@PathVariable("id") Integer id) {
        try {
            Category category = categoryService.getCategoryById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("id", category.getId());
            response.put("name", category.getName());

            if (category.getParent() != null) {
                Map<String, Object> parentMap = new HashMap<>();
                parentMap.put("id", category.getParent().getId());
                parentMap.put("name", category.getParent().getName());
                response.put("parent", parentMap);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/tree")
    public ResponseEntity<List<CategoryTreeResponse>> getCategoryTree() {
        return ResponseEntity.ok(categoryService.getCategoryTree());
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllCategoriesAdmin() {
        return ResponseEntity.ok(categoryService.getAllCategoriesForAdmin());
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PostMapping("/admin")
    public ResponseEntity<?> createCategory(@RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.createCategory(request));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable("id") Integer id, @RequestBody CategoryRequest request) {
        try {
            return ResponseEntity.ok(categoryService.updateCategory(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable("id") Integer id) {
        try {
            categoryService.deleteCategory(id);
            return ResponseEntity.ok("Xóa danh mục thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Không thể xóa danh mục này!");
        }
    }
}
