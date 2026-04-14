package com.service.productservice.service;

import com.service.productservice.dto.CategoryAdminResponse;
import com.service.productservice.dto.CategoryRequest;
import com.service.productservice.dto.CategoryTreeResponse;
import com.service.productservice.model.Category;
import com.service.productservice.repository.CategoryRepository;
import com.service.productservice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public Category getCategoryById(Integer id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));
    }

    // Lấy toàn bộ danh mục theo dạng cây
    @Transactional(readOnly = true)
    public List<CategoryTreeResponse> getCategoryTree() {
        // Chỉ lấy những danh mục gốc (Cha là null)
        List<Category> rootCategories = categoryRepository.findByParentIsNull();

        // Chuyển đổi sang DTO đệ quy
        return rootCategories.stream()
                .map(this::mapToTreeResponse)
                .collect(Collectors.toList());
    }

    // Hàm đệ quy: Map cha, sau đó tự động map các con của nó
    private CategoryTreeResponse mapToTreeResponse(Category category) {
        return CategoryTreeResponse.builder()
                .id(category.getId())
                .name(category.getName())
                // Gọi đệ quy: Lấy danh sách con -> stream -> map lại chính hàm này
                .children(category.getChildren().stream()
                        .map(this::mapToTreeResponse)
                        .collect(Collectors.toList()))
                .build();
    }

    private List<Integer> getAllDescendantIds(Category category) {
        List<Integer> ids = new ArrayList<>();
        ids.add(category.getId());

        if (category.getChildren() != null && !category.getChildren().isEmpty()) {
            for (Category child : category.getChildren()) {
                ids.addAll(getAllDescendantIds(child));
            }
        }
        return ids;
    }

    @Transactional(readOnly = true)
    public List<CategoryAdminResponse> getAllCategoriesForAdmin() {
        return categoryRepository.findAll().stream().map(c -> {
            List<Integer> allCategoryIds = getAllDescendantIds(c);
            int totalProducts = productRepository.countByCategory_IdIn(allCategoryIds);

            Category parent = c.getParent();

            return CategoryAdminResponse.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .isFeatured(c.getIsFeatured())
                    .displayConfig(c.getDisplayConfig())
                    .productCount(totalProducts)
                    .parentId(parent != null ? parent.getId() : null)
                    .parentName(parent != null ? parent.getName() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public CategoryAdminResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .isFeatured(request.getIsFeatured())
                .displayConfig(request.getDisplayConfig())
                .build();

        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId()).orElse(null);
            category.setParent(parent);
        }

        categoryRepository.save(category);
        return getAllCategoriesForAdmin().stream().filter(c -> c.getId().equals(category.getId())).findFirst().orElse(null);
    }

    @Transactional
    public CategoryAdminResponse updateCategory(Integer id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));

        category.setName(request.getName());
        category.setIsFeatured(request.getIsFeatured());
        category.setDisplayConfig(request.getDisplayConfig());

        if (request.getParentId() != null) {
            if (request.getParentId().equals(id)) {
                throw new RuntimeException("Danh mục không thể tự làm cha của chính nó!");
            }
            Category parent = categoryRepository.findById(request.getParentId()).orElse(null);
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        categoryRepository.save(category);
        return getAllCategoriesForAdmin().stream().filter(c -> c.getId().equals(category.getId())).findFirst().orElse(null);
    }

    @Transactional
    public void deleteCategory(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy danh mục để xóa!");
        }
        categoryRepository.deleteById(id);
    }

    /**
     * Tìm cấu hình hiển thị.
     * Nếu danh mục hiện tại không có, sẽ tìm ở danh mục cha.
     */
    public String getEffectiveDisplayConfig(Category category) {
        // Nếu danh mục hiện tại có cấu hình
        if (category.getDisplayConfig() != null && !category.getDisplayConfig().trim().isEmpty()) {
            return category.getDisplayConfig();
        }

        // Nếu không có cấu hình và có danh mục cha, tìm tiếp ở cha
        if (category.getParent() != null) {
            return getEffectiveDisplayConfig(category.getParent());
        }

        // Nếu tìm hết cấp mà vẫn không thấy thì trả về null
        return null;
    }
}
