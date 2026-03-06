package com.lifeos.api.service;

import com.lifeos.api.dto.CanvasEdgeRequest;
import com.lifeos.api.dto.CanvasEdgeResponse;
import com.lifeos.api.dto.CanvasNodeRequest;
import com.lifeos.api.dto.CanvasNodeResponse;
import com.lifeos.api.entity.CanvasEdge;
import com.lifeos.api.entity.CanvasNode;
import com.lifeos.api.entity.Note;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.CanvasEdgeRepository;
import com.lifeos.api.repository.CanvasNodeRepository;
import com.lifeos.api.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CanvasService {

    private final CanvasNodeRepository canvasNodeRepository;
    private final CanvasEdgeRepository canvasEdgeRepository;
    private final NoteRepository noteRepository;

    public List<CanvasNodeResponse> getNodes(String canvasId) {
        UUID userId = getCurrentUserId();
        List<CanvasNode> nodes = canvasNodeRepository.findByUserIdAndCanvasId(userId, canvasId);
        return nodes.stream().map(this::mapNodeToResponse).collect(Collectors.toList());
    }

    public List<CanvasEdgeResponse> getEdges(String canvasId) {
        UUID userId = getCurrentUserId();
        List<CanvasEdge> edges = canvasEdgeRepository.findByUserIdAndCanvasId(userId, canvasId);
        return edges.stream().map(this::mapEdgeToResponse).collect(Collectors.toList());
    }

    @Transactional
    public CanvasNodeResponse createNode(CanvasNodeRequest request) {
        User user = getCurrentUser();
        CanvasNode node = new CanvasNode();
        node.setCanvasId(request.getCanvasId());
        node.setLabel(request.getLabel());
        node.setContent(request.getContent());
        node.setX(request.getX());
        node.setY(request.getY());
        node.setWidth(request.getWidth());
        node.setHeight(request.getHeight());
        node.setColor(request.getColor());
        node.setNodeType(request.getNodeType() != null ? request.getNodeType() : "text");
        node.setUser(user);

        if (request.getNoteId() != null) {
            Note note = noteRepository.findById(request.getNoteId()).orElse(null);
            if (note != null && note.getUser().getId().equals(user.getId())) {
                node.setNote(note);
            }
        }

        node = canvasNodeRepository.save(node);
        return mapNodeToResponse(node);
    }

    @Transactional
    public CanvasNodeResponse updateNode(UUID id, CanvasNodeRequest request) {
        CanvasNode node = findNodeByIdAndUser(id);
        node.setLabel(request.getLabel());
        node.setContent(request.getContent());
        node.setX(request.getX());
        node.setY(request.getY());
        node.setWidth(request.getWidth());
        node.setHeight(request.getHeight());
        if (request.getColor() != null) node.setColor(request.getColor());
        if (request.getNodeType() != null) node.setNodeType(request.getNodeType());

        if (request.getNoteId() != null) {
            Note note = noteRepository.findById(request.getNoteId()).orElse(null);
            if (note != null && note.getUser().getId().equals(getCurrentUserId())) {
                node.setNote(note);
            }
        } else {
            node.setNote(null);
        }

        node = canvasNodeRepository.save(node);
        return mapNodeToResponse(node);
    }

    @Transactional
    public void deleteNode(UUID id) {
        CanvasNode node = findNodeByIdAndUser(id);
        // Delete associated edges first
        canvasEdgeRepository.deleteBySourceNodeIdOrTargetNodeId(id, id);
        canvasNodeRepository.delete(node);
    }

    @Transactional
    public CanvasEdgeResponse createEdge(CanvasEdgeRequest request) {
        User user = getCurrentUser();

        CanvasNode sourceNode = findNodeByIdAndUser(request.getSourceNodeId());
        CanvasNode targetNode = findNodeByIdAndUser(request.getTargetNodeId());

        CanvasEdge edge = new CanvasEdge();
        edge.setCanvasId(request.getCanvasId());
        edge.setSourceNode(sourceNode);
        edge.setTargetNode(targetNode);
        edge.setLabel(request.getLabel());
        edge.setUser(user);

        edge = canvasEdgeRepository.save(edge);
        return mapEdgeToResponse(edge);
    }

    @Transactional
    public void deleteEdge(UUID id) {
        CanvasEdge edge = canvasEdgeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("CanvasEdge", "id", id));
        if (!edge.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("CanvasEdge", "id", id);
        }
        canvasEdgeRepository.delete(edge);
    }

    // ==================== Private Helpers ====================

    private CanvasNode findNodeByIdAndUser(UUID id) {
        CanvasNode node = canvasNodeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("CanvasNode", "id", id));
        if (!node.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("CanvasNode", "id", id);
        }
        return node;
    }

    private CanvasNodeResponse mapNodeToResponse(CanvasNode node) {
        return CanvasNodeResponse.builder()
            .id(node.getId())
            .canvasId(node.getCanvasId())
            .noteId(node.getNote() != null ? node.getNote().getId() : null)
            .noteTitle(node.getNote() != null ? node.getNote().getTitle() : null)
            .label(node.getLabel())
            .content(node.getContent())
            .x(node.getX())
            .y(node.getY())
            .width(node.getWidth())
            .height(node.getHeight())
            .color(node.getColor())
            .nodeType(node.getNodeType())
            .createdAt(node.getCreatedAt())
            .build();
    }

    private CanvasEdgeResponse mapEdgeToResponse(CanvasEdge edge) {
        return CanvasEdgeResponse.builder()
            .id(edge.getId())
            .canvasId(edge.getCanvasId())
            .sourceNodeId(edge.getSourceNode().getId())
            .targetNodeId(edge.getTargetNode().getId())
            .label(edge.getLabel())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
