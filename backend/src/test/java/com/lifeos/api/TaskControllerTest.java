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

class TaskControllerTest extends BaseIntegrationTest {

    @Test
    void createTask_returns201() throws Exception {
        String token = registerAndGetToken("task-create@example.com");

        String taskJson = objectMapper.writeValueAsString(Map.of(
            "title", "Write unit tests",
            "description", "Write comprehensive unit tests for the API",
            "priority", "HIGH",
            "status", "TODO"
        ));

        mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Write unit tests")))
                .andExpect(jsonPath("$.priority", is("HIGH")));
    }

    @Test
    void getAllTasks_returns200WithPagination() throws Exception {
        String token = registerAndGetToken("task-getall@example.com");

        String taskJson1 = objectMapper.writeValueAsString(Map.of(
            "title", "Task One",
            "description", "First task",
            "priority", "HIGH",
            "status", "TODO"
        ));

        String taskJson2 = objectMapper.writeValueAsString(Map.of(
            "title", "Task Two",
            "description", "Second task",
            "priority", "LOW",
            "status", "TODO"
        ));

        mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson1))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson2))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/tasks")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", notNullValue()))
                .andExpect(jsonPath("$.content.length()", greaterThanOrEqualTo(2)));
    }

    @Test
    void getTaskById_returns200() throws Exception {
        String token = registerAndGetToken("task-getbyid@example.com");

        String taskJson = objectMapper.writeValueAsString(Map.of(
            "title", "Specific Task",
            "description", "A task to fetch by ID",
            "priority", "MEDIUM",
            "status", "TODO"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isCreated())
                .andReturn();

        String taskId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/tasks/" + taskId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Specific Task")))
                .andExpect(jsonPath("$.description", is("A task to fetch by ID")));
    }

    @Test
    void updateTask_returns200() throws Exception {
        String token = registerAndGetToken("task-update@example.com");

        String taskJson = objectMapper.writeValueAsString(Map.of(
            "title", "Original Title",
            "description", "Original description",
            "priority", "LOW",
            "status", "TODO"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isCreated())
                .andReturn();

        String taskId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        String updateJson = objectMapper.writeValueAsString(Map.of(
            "title", "Updated Title",
            "description", "Updated description",
            "priority", "HIGH",
            "status", "IN_PROGRESS"
        ));

        mockMvc.perform(put("/api/tasks/" + taskId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title")))
                .andExpect(jsonPath("$.description", is("Updated description")))
                .andExpect(jsonPath("$.priority", is("HIGH")))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));
    }

    @Test
    void deleteTask_returns204() throws Exception {
        String token = registerAndGetToken("task-delete@example.com");

        String taskJson = objectMapper.writeValueAsString(Map.of(
            "title", "Task to Delete",
            "description", "This task will be deleted",
            "priority", "LOW",
            "status", "TODO"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isCreated())
                .andReturn();

        String taskId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(delete("/api/tasks/" + taskId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/" + taskId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createTaskWithoutAuth_returnsUnauthorized() throws Exception {
        String taskJson = objectMapper.writeValueAsString(Map.of(
            "title", "Unauthorized Task",
            "description", "Should not be created",
            "priority", "HIGH",
            "status", "TODO"
        ));

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getTaskThatDoesNotExist_returns404() throws Exception {
        String token = registerAndGetToken("task-notfound@example.com");

        mockMvc.perform(get("/api/tasks/99999999")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
