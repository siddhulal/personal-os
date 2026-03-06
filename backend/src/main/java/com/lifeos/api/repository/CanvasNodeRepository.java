package com.lifeos.api.repository;

import com.lifeos.api.entity.CanvasNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CanvasNodeRepository extends JpaRepository<CanvasNode, UUID> {

    List<CanvasNode> findByUserIdAndCanvasId(UUID userId, String canvasId);
}
