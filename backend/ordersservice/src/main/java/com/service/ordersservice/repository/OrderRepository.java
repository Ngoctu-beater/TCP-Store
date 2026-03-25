package com.service.ordersservice.repository;

import com.service.ordersservice.enums.OrderStatus;
import com.service.ordersservice.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Integer userId);
    Optional<Order> findByOrderCode(String orderCode);

    // thống kê đơn hàng
    @Query(value = "SELECT o FROM Order o WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:status IS NULL OR o.orderStatus = :status)",
            countQuery = "SELECT COUNT(o) FROM Order o WHERE " +
                    "(:keyword IS NULL OR :keyword = '' OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                    "AND (:status IS NULL OR o.orderStatus = :status)")
    Page<Order> searchOrdersForAdmin(@Param("keyword") String keyword, @Param("status") OrderStatus status, Pageable pageable);
    long countByOrderStatus(com.service.ordersservice.enums.OrderStatus status);
}
