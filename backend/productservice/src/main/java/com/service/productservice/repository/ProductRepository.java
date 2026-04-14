package com.service.productservice.repository;

import com.service.productservice.model.Product;
import com.service.productservice.model.StockStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    List<Product> findByCategory_IdIn(List<Integer> categoryIds);

    Page<Product> findByCategory_IdIn(List<Integer> categoryIds, Pageable pageable);

    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock - :quantity WHERE p.id = :productId AND p.stock >= :quantity")
    int decreaseStock(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock + :quantity WHERE p.id = :productId")
    void increaseStock(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    @Modifying
    @Query("UPDATE Product p SET p.sold = COALESCE(p.sold, 0) + :quantity WHERE p.id = :productId")
    void increaseSold(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    int countByCategory_IdIn(List<Integer> categoryIds);

    @Query(value = "SELECT p FROM Product p WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:hasCategory = false OR p.category.id IN :categoryIds) " +
            "AND (:status IS NULL OR p.stockStatus = :status)",
            countQuery = "SELECT COUNT(p) FROM Product p WHERE " +
                    "(:keyword IS NULL OR :keyword = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                    "AND (:hasCategory = false OR p.category.id IN :categoryIds) " +
                    "AND (:status IS NULL OR p.stockStatus = :status)")
    Page<Product> searchProductsForAdmin(@Param("keyword") String keyword,
                                         @Param("hasCategory") boolean hasCategory,
                                         @Param("categoryIds") List<Integer> categoryIds,
                                         @Param("status") StockStatus status,
                                         Pageable pageable);
}
