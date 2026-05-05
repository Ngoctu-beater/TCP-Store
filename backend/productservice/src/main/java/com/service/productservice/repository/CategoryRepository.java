package com.service.productservice.repository;

import com.service.productservice.model.Category;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // Tìm các danh mục gốc
    List<Category> findByParentIsNull();

    // Tìm danh mục nổi bật
    List<Category> findByIsFeaturedTrue(Pageable pageable);
    List<Category> findByParent_Id(Integer parentId);
}
