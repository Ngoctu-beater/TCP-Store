package com.service.productservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.productservice.dto.*;
import com.service.productservice.model.*;
import com.service.productservice.repository.CategoryRepository;
import com.service.productservice.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
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
    private final CategoryService categoryService;

    @PersistenceContext
    private EntityManager entityManager;

    // LẤY CHI TIẾT SẢN PHẨM THEO ID
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm có ID: " + id));
        return mapToResponse(product);
    }

    // LẤY SẢN PHẨM THEO DANH MỤC
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

        // Lấy config của chính danh mục này
        if (category.getDisplayConfig() != null && !category.getDisplayConfig().isEmpty()) {
            try {
                return objectMapper.readValue(category.getDisplayConfig(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                System.err.println("Lỗi parse config category " + category.getId() + ": " + e.getMessage());
            }
        }

        // Nếu không có, tìm lên danh mục cha
        return getCategoryConfigRecursive(category.getParent());
    }

    private ProductResponse mapToResponse(Product product) {
        Map<String, Object> specsMap = Collections.emptyMap();
        try {
            if (product.getSpecs() != null && !product.getSpecs().isEmpty()) {
                specsMap = objectMapper.readValue(product.getSpecs(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (JsonProcessingException e) {}

        List<String> images = new ArrayList<>();
        if (product.getImages() != null) {
            images = product.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList());
        }
        List<ProductResponse.ColorDTO> colors = new ArrayList<>();
        if (product.getColors() != null) {
            colors = product.getColors().stream().map(c -> ProductResponse.ColorDTO.builder()
                    .colorName(c.getColorName()).colorImageUrl(c.getColorImageUrl()).build()).collect(Collectors.toList());
        }

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

    // OPTIONS BỘ LỌC
    public Map<String, Object> getFilterOptions(Integer categoryId) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null) return Collections.emptyMap();

        String configStr = categoryService.getEffectiveDisplayConfig(category);
        if (configStr == null) return Collections.emptyMap();

        try {
            Map<String, Object> config = objectMapper.readValue(configStr, new TypeReference<Map<String, Object>>() {});

            Map<String, Object> predefinedOptions = (Map<String, Object>) config.get("filter");
            if (predefinedOptions == null) predefinedOptions = new LinkedHashMap<>();

            List<Integer> allCategoryIds = getAllDescendantIds(categoryId);
            List<Product> products = productRepository.findByCategory_IdIn(allCategoryIds);

            Set<String> brandNames = new HashSet<>();
            for (Product p : products) {
                if (p.getBrand() != null) {
                    brandNames.add(p.getBrand().getName());
                }
            }

            predefinedOptions.put("brand", new ArrayList<>(brandNames));

            Map<String, Object> response = new HashMap<>();
            response.put("labels", config.get("labels"));
            response.put("filters", predefinedOptions);

            return response;

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyMap();
        }
    }

    // TÌM KIẾM SẢN PHẨM
    @Transactional(readOnly = true)
    public ProductPageResponse searchPublicProducts(String keyword, Integer categoryId, BigDecimal minPrice, BigDecimal maxPrice, String brandName, String specs, int page, int size, String sortBy, String sortDir) {

        // SQL lấy data và tổng số trang
        StringBuilder sql = new StringBuilder("SELECT p.* FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.is_active = true");
        StringBuilder countSql = new StringBuilder("SELECT COUNT(*) FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.is_active = true");

        Map<String, Object> params = new HashMap<>();

        // Xử lý Từ khóa
        if (keyword != null && !keyword.trim().isEmpty()) {
            sql.append(" AND LOWER(p.name) LIKE LOWER(:keyword)");
            countSql.append(" AND LOWER(p.name) LIKE LOWER(:keyword)");
            params.put("keyword", "%" + keyword + "%");
        }

        // Xử lý Danh mục
        if (categoryId != null) {
            List<Integer> categoryIds = getAllDescendantIds(categoryId);
            sql.append(" AND p.category_id IN (:categoryIds)");
            countSql.append(" AND p.category_id IN (:categoryIds)");
            params.put("categoryIds", categoryIds);
        }

        // Xử lý Thương hiệu
        if (brandName != null && !brandName.trim().isEmpty()) {
            sql.append(" AND b.name = :brandName");
            countSql.append(" AND b.name = :brandName");
            params.put("brandName", brandName);
        }

        // Xử lý Giá
        if (minPrice != null) {
            sql.append(" AND p.sale_price >= :minPrice");
            countSql.append(" AND p.sale_price >= :minPrice");
            params.put("minPrice", minPrice);
        }
        if (maxPrice != null) {
            sql.append(" AND p.sale_price <= :maxPrice");
            countSql.append(" AND p.sale_price <= :maxPrice");
            params.put("maxPrice", maxPrice);
        }

        if (specs != null && !specs.trim().isEmpty() && !specs.equals("{}")) {
            try {
                Map<String, String> specMap = objectMapper.readValue(specs, new TypeReference<Map<String, String>>() {});
                int i = 0;
                for (Map.Entry<String, String> entry : specMap.entrySet()) {
                    String safeKey = entry.getKey().replaceAll("[^a-zA-Z0-9_]", "");
                    String val = entry.getValue();
                    String paramName = "specVal" + i;

                    if (val.equalsIgnoreCase("Card Onboard")) {
                        sql.append(" AND (LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%intel%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%uhd%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%iris%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%radeon graphics%')");

                        countSql.append(" AND (LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%intel%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%uhd%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%iris%' ")
                                .append(" OR LOWER(p.specs->>'$.").append(safeKey).append("') LIKE '%radeon graphics%')");
                    } else {
                        sql.append(" AND LOWER(p.specs->>'$.").append(safeKey).append("') LIKE LOWER(:").append(paramName).append(")");
                        countSql.append(" AND LOWER(p.specs->>'$.").append(safeKey).append("') LIKE LOWER(:").append(paramName).append(")");
                        params.put(paramName, "%" + val + "%");
                    }
                    i++;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Xử lý Sắp xếp
        String dbSortBy = "salePrice".equalsIgnoreCase(sortBy) ? "p.sale_price" : "p.created_at";
        String dir = sortDir.equalsIgnoreCase("ASC") ? "ASC" : "DESC";
        sql.append(" ORDER BY ").append(dbSortBy).append(" ").append(dir);

        Query query = entityManager.createNativeQuery(sql.toString(), Product.class);
        Query countQuery = entityManager.createNativeQuery(countSql.toString());

        // Đổ tham số vào lệnh SQL
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }

        // Phân trang
        query.setFirstResult(page * size);
        query.setMaxResults(size);

        // Lấy kết quả
        List<Product> products = query.getResultList();
        long totalElements = ((Number) countQuery.getSingleResult()).longValue();
        int totalPages = (int) Math.ceil((double) totalElements / size);

        List<ProductResponse> content = products.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(page)
                .pageSize(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();
    }

    // SẢN PHẨM LIÊN QUAN
    public List<Map<String, Object>> getRelatedProducts(Integer productId) {
        // Tìm sản phẩm hiện tại để lấy category_id của nó
        Product currentProduct = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        Integer categoryId = currentProduct.getCategory().getId();

        // Tìm các sản phẩm liên quan
        List<Product> relatedProducts = productRepository.findRelatedProducts(categoryId, productId);

        // Chống lỗi vòng lặp JSON
        return relatedProducts.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("name", p.getName());
            map.put("salePrice", p.getSalePrice());
            map.put("thumbnail", p.getThumbnail());
            map.put("basePrice", p.getBasePrice());
            map.put("stock", p.getStock());
            return map;
        }).toList();
    }
}
