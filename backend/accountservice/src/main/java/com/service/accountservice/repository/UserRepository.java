package com.service.accountservice.repository;

import com.service.accountservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    // Tìm kiếm user bằng email để đăng nhập
    Optional<User> findByEmail(String email);

    // Kiểm tra email đã tồn tại chưa
    Boolean existsByEmail(String email);

    // Tìm kiếm khách hàng có phân trang
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.roleName = 'USER' " +
            "AND (:keyword IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR u.phoneNumber LIKE CONCAT('%', :keyword, '%'))")
    Page<User> searchCustomers(@Param("keyword") String keyword, Pageable pageable);
    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);
    long countByCreatedAtBetween(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);

    // Thống kê người dùng mới theo Role
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.roleName = 'USER' AND u.createdAt BETWEEN :startDate AND :endDate")
    long countNewUsersByRoleAndDateRange(@Param("startDate") java.time.LocalDateTime startDate, @Param("endDate") java.time.LocalDateTime endDate);
}
