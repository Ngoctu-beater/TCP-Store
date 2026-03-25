package com.service.accountservice.repository;

import com.service.accountservice.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    // Tìm role theo tên (VD: tìm ROLE_USER để gán cho người mới)
    Optional<Role> findByRoleName(String roleName);
}
