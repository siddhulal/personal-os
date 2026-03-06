package com.lifeos.api.repository;

import com.lifeos.api.entity.CanvasEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CanvasEdgeRepository extends JpaRepository<CanvasEdge, UUID> {

    List<CanvasEdge> findByUserIdAndCanvasId(UUID userId, String canvasId);

    @Modifying
    @Query("DELETE FROM CanvasEdge e WHERE e.sourceNode.id = :id OR e.targetNode.id = :id")
    void deleteBySourceNodeIdOrTargetNodeId(@Param("id") UUID id);
}
