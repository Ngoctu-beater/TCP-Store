package com.service.productservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.productservice.dto.*;
import com.service.productservice.model.*;
import com.service.productservice.repository.CategoryRepository;
import com.service.productservice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;

    // --- LẤY CHI TIẾT SẢN PHẨM THEO ID ---
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm có ID: " + id));
        return mapToResponse(product);
    }

    // --- LẤY SẢN PHẨM THEO DANH MỤC ---
    @Transactional(readOnly = true)
    public ProductPageResponse getProductsByCategory(Integer categoryId, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        List<Integer> allCategoryIds = getAllDescendantIds(categoryId);
        Page<Product> productPage = productRepository.findByCategory_IdIn(allCategoryIds, pageable);

        List<ProductResponse> content = productPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(productPage.getNumber())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }

    private List<Integer> getAllDescendantIds(Integer parentId) {
        List<Integer> result = new ArrayList<>();
        result.add(parentId);
        List<Category> children = categoryRepository.findByParent_Id(parentId);
        for (Category child : children) {
            result.addAll(getAllDescendantIds(child.getId()));
        }
        return result;
    }

    private Map<String, Object> getCategoryConfigRecursive(Category category) {
        if (category == null) return null;

        // Ưu tiên 1: Lấy config của chính danh mục này
        if (category.getDisplayConfig() != null && !category.getDisplayConfig().isEmpty()) {
            try {
                return objectMapper.readValue(category.getDisplayConfig(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                System.err.println("Lỗi parse config category " + category.getId() + ": " + e.getMessage());
            }
        }

        // Ưu tiên 2: Nếu không có, tìm lên danh mục cha
        return getCategoryConfigRecursive(category.getParent());
    }

    private ProductResponse mapToResponse(Product product) {
        // Map Specs
        Map<String, Object> specsMap = Collections.emptyMap();
        try {
            if (product.getSpecs() != null && !product.getSpecs().isEmpty()) {
                specsMap = objectMapper.readValue(product.getSpecs(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (JsonProcessingException e) { /*...*/ }

        // Map Images & Colors
        List<String> images = new ArrayList<>();
        if (product.getImages() != null) {
            images = product.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList());
        }
        List<ProductResponse.ColorDTO> colors = new ArrayList<>();
        if (product.getColors() != null) {
            colors = product.getColors().stream().map(c -> ProductResponse.ColorDTO.builder()
                    .colorName(c.getColorName()).colorImageUrl(c.getColorImageUrl()).build()).collect(Collectors.toList());
        }

        // MAP CONFIG
        Map<String, Object> categoryConfigMap = getCategoryConfigRecursive(product.getCategory());

        return ProductResponse.builder()
                .id(product.getId())
                .categoryName(product.getCategory().getName())
                .sku(product.getSku())
                .name(product.getName())
                .thumbnail(product.getThumbnail())
                .salePrice(product.getSalePrice())
                .basePrice(product.getBasePrice())
                .sold(product.getSold() != null ? product.getSold() : 0)
                .stock(product.getStock())
                .stockStatus(product.getStockStatus())
                .specs(specsMap)
                .images(images)
                .colors(colors)
                .categoryConfig(categoryConfigMap)
                .build();
    }

    @Transactional
    public void decreaseStock(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            int updatedRows = productRepository.decreaseStock(req.getProductId(), req.getQuantity());
            if (updatedRows == 0) {
                throw new RuntimeException("Sản phẩm ID " + req.getProductId() + " không đủ tồn kho để đặt hàng!");
            }
        }
    }

    @Transactional
    public void increaseStock(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            productRepository.increaseStock(req.getProductId(), req.getQuantity());
        }
    }

    @Transactional
    public void increaseSold(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            productRepository.increaseSold(req.getProductId(), req.getQuantity());
        }
    }

    @Transactional(readOnly = true)
    public ProductPageResponse getAllProductsForAdmin(String keyword, Integer categoryId, String statusStr, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        StockStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try { status = StockStatus.valueOf(statusStr.toUpperCase()); }
            catch (IllegalArgumentException e) { }
        }

        boolean hasCategory = false;
        List<Integer> categoryIds = new ArrayList<>();

        if (categoryId != null) {
            hasCategory = true;
            categoryIds = getAllDescendantIds(categoryId);
        } else {
            categoryIds.add(-1);
        }

        Page<Product> productPage = productRepository.searchProductsForAdmin(keyword, hasCategory, categoryIds, status, pageable);

        List<ProductResponse> content = productPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(productPage.getNumber())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));

        String specsJson = "{}";
        try {
            if (request.getSpecs() != null) {
                specsJson = objectMapper.writeValueAsString(request.getSpecs());
            }
        } catch (Exception e) { e.printStackTrace(); }

        Product product = Product.builder()
                .name(request.getName())
                .sku(request.getSku())
                .category(category)
                .costPrice(request.getCostPrice())
                .basePrice(request.getBasePrice())
                .salePrice(request.getSalePrice())
                .stock(request.getStock())
                .stockStatus(StockStatus.valueOf(request.getStockStatus()))
                .isActive(request.getIsActive())
                .isFeatured(request.getIsFeatured())
                .thumbnail(request.getThumbnail())
                .specs(specsJson)
                .sold(0)
                .build();

        Product savedProduct = productRepository.save(product);

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<ProductImage> productImages = request.getImages().stream()
                    .map(url -> ProductImage.builder().product(savedProduct).imageUrl(url).build())
                    .collect(Collectors.toList());
            savedProduct.setImages(productImages);
        }

        if (request.getColors() != null && !request.getColors().isEmpty()) {
            List<ProductColor> productColors = request.getColors().stream()
                    .map(c -> ProductColor.builder()
                            .product(savedProduct)
                            .colorName(c.getColorName())
                            .colorImageUrl(c.getColorImageUrl())
                            .build())
                    .collect(Collectors.toList());
            savedProduct.setColors(productColors);
        }

        return mapToResponse(productRepository.save(savedProduct));
    }

    @Transactional
    public ProductResponse updateProduct(Integer id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));

        String specsJson = "{}";
        try {
            if (request.getSpecs() != null) {
                specsJson = objectMapper.writeValueAsString(request.getSpecs());
            }
        } catch (Exception e) {
            System.err.println("Lỗi parse JSON specs khi cập nhật: " + e.getMessage());
        }

        product.setName(request.getName());
        product.setSku(request.getSku());
        product.setCategory(category);

        product.setCostPrice(request.getCostPrice());
        product.setBasePrice(request.getBasePrice());
        product.setSalePrice(request.getSalePrice());

        product.setStock(request.getStock());
        product.setStockStatus(StockStatus.valueOf(request.getStockStatus()));
        product.setIsActive(request.getIsActive());
        product.setIsFeatured(request.getIsFeatured());
        product.setThumbnail(request.getThumbnail());
        product.setSpecs(specsJson);

        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }
        product.getImages().clear();

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<ProductImage> newImages = request.getImages().stream()
                    .map(url -> ProductImage.builder()
                            .product(product)
                            .imageUrl(url)
                            .build())
                    .collect(Collectors.toList());
            product.getImages().addAll(newImages);
        }

        if (product.getColors() == null) {
            product.setColors(new ArrayList<>());
        }
        product.getColors().clear();

        if (request.getColors() != null && !request.getColors().isEmpty()) {
            List<ProductColor> newColors = request.getColors().stream()
                    .map(c -> ProductColor.builder()
                            .product(product)
                            .colorName(c.getColorName())
                            .colorImageUrl(c.getColorImageUrl())
                            .build())
                    .collect(Collectors.toList());
            product.getColors().addAll(newColors);
        }

        Product updatedProduct = productRepository.save(product);
        return mapToResponse(updatedProduct);
    }

    @Transactional
    public void deleteProduct(Integer id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy sản phẩm có ID: " + id + " để xóa!");
        }

        productRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<CategoryStatResponse> getCategoryStatistics() {
        List<Product> products = productRepository.findAll();
        Map<String, CategoryStatResponse> statMap = new HashMap<>();

        for (Product p : products) {
            String catName = p.getCategory().getName();

            CategoryStatResponse stat = statMap.getOrDefault(catName, new CategoryStatResponse());
            stat.setCategoryName(catName);

            long currentSold = p.getSold() != null ? p.getSold() : 0;
            stat.setTotalSold(stat.getTotalSold() + currentSold);

            BigDecimal currentRevenue = p.getSalePrice().multiply(BigDecimal.valueOf(currentSold));
            if (stat.getTotalRevenue() == null) {
                stat.setTotalRevenue(currentRevenue);
            } else {
                stat.setTotalRevenue(stat.getTotalRevenue().add(currentRevenue));
            }

            stat.setGrowth("+" + (int)(Math.random() * 20 + 5) + "%");

            statMap.put(catName, stat);
        }

        return statMap.values().stream()
                .sorted((a, b) -> Long.compare(b.getTotalSold(), a.getTotalSold()))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductCategoryInfoResponse> getCategoryInfoForProducts(List<Integer> productIds) {
        List<Product> products = productRepository.findAllById(productIds);
        return products.stream().map(p ->
                ProductCategoryInfoResponse.builder()
                        .productId(p.getId())
                        .categoryId(p.getCategory().getId())
                        .categoryName(p.getCategory().getName())
                        .build()
        ).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductPageResponse searchPublicProducts(String keyword, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Product> productPage = productRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(keyword, pageable);

        List<ProductResponse> content = productPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(productPage.getNumber())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }
}
