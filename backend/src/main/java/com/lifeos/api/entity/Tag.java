package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"user"})
@Entity
@Table(name = "tags", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "user_id"})
})
public class Tag extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column
    private String color;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
