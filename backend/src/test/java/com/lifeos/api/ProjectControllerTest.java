package com.lifeos.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProjectControllerTest extends BaseIntegrationTest {

    @Test
    void createProject_returns201() throws Exception {
        String token = registerAndGetToken("project-create@example.com");

        String projectJson = objectMapper.writeValueAsString(Map.of(
            "name", "Personal Life OS",
            "description", "A comprehensive personal management application",
            "status", "ACTIVE"
        ));

        mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Personal Life OS")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    void getAllProjects_returns200WithPagination() throws Exception {
        String token = registerAndGetToken("project-getall@example.com");

        String projectJson1 = objectMapper.writeValueAsString(Map.of(
            "name", "Project Alpha",
            "description", "First project",
            "status", "ACTIVE"
        ));

        String projectJson2 = objectMapper.writeValueAsString(Map.of(
            "name", "Project Beta",
            "description", "Second project",
            "status", "PLANNING"
        ));

        mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson1))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson2))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/projects")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", notNullValue()))
                .andExpect(jsonPath("$.content.length()", greaterThanOrEqualTo(2)));
    }

    @Test
    void getProjectById_returns200() throws Exception {
        String token = registerAndGetToken("project-getbyid@example.com");

        String projectJson = objectMapper.writeValueAsString(Map.of(
            "name", "Specific Project",
            "description", "A project to fetch by ID",
            "status", "ACTIVE"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson))
                .andExpect(status().isCreated())
                .andReturn();

        String projectId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/projects/" + projectId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Specific Project")))
                .andExpect(jsonPath("$.description", is("A project to fetch by ID")));
    }

    @Test
    void updateProject_returns200() throws Exception {
        String token = registerAndGetToken("project-update@example.com");

        String projectJson = objectMapper.writeValueAsString(Map.of(
            "name", "Original Project",
            "description", "Original description",
            "status", "PLANNING"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson))
                .andExpect(status().isCreated())
                .andReturn();

        String projectId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        String updateJson = objectMapper.writeValueAsString(Map.of(
            "name", "Updated Project",
            "description", "Updated description",
            "status", "ACTIVE"
        ));

        mockMvc.perform(put("/api/projects/" + projectId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Updated Project")))
                .andExpect(jsonPath("$.description", is("Updated description")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    void deleteProject_returns204() throws Exception {
        String token = registerAndGetToken("project-delete@example.com");

        String projectJson = objectMapper.writeValueAsString(Map.of(
            "name", "Project to Delete",
            "description", "This project will be deleted",
            "status", "ACTIVE"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson))
                .andExpect(status().isCreated())
                .andReturn();

        String projectId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(delete("/api/projects/" + projectId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/projects/" + projectId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createProjectWithoutAuth_returnsUnauthorized() throws Exception {
        String projectJson = objectMapper.writeValueAsString(Map.of(
            "name", "Unauthorized Project",
            "description", "Should not be created",
            "status", "ACTIVE"
        ));

        mockMvc.perform(post("/api/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(projectJson))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProjectThatDoesNotExist_returns404() throws Exception {
        String token = registerAndGetToken("project-notfound@example.com");

        mockMvc.perform(get("/api/projects/99999999")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
