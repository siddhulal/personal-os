package com.lifeos.api.repository;

import com.lifeos.api.entity.CanvasEdge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CanvasEdgeRepository extends JpaRepository<CanvasEdge, UUID> {

    List<CanvasEdge> findByUserIdAndCanvasId(UUID userId, String canvasId);

    void deleteBySourceNodeIdOrTargetNodeId(UUID sourceId, UUID targetId);
}
