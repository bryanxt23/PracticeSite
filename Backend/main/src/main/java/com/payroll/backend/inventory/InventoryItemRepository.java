package com.payroll.backend.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByStoreId(Long storeId);
    @Transactional
    void deleteByStoreId(Long storeId);
}
