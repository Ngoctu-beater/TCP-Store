package com.service.accountservice.repository;

import com.service.accountservice.model.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<UserAddress, Integer> {
    // Lấy danh sách địa chỉ: Ưu tiên mặc định lên đầu, sau đó đến ngày tạo mới nhất
    List<UserAddress> findByUserUserIdOrderByIsDefaultDescCreatedAtDesc(Integer userId);

    // Tìm địa chỉ đang là mặc định
    Optional<UserAddress> findByUserUserIdAndIsDefaultTrue(Integer userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserAddress a SET a.isDefault = false WHERE a.user.userId = :userId")
    void resetDefaultStatusByUserId(@Param("userId") Integer userId);

    // Tìm địa chỉ của User và kiểm tra quyền sở hữu
    Optional<UserAddress> findByAddressIdAndUserEmail(Integer addressId, String email);

    int countByUserUserId(Integer userId);
}
