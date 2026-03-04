package com.lifeos.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LearningControllerTest extends BaseIntegrationTest {

    @Test
    void createRoadmap_returns201() throws Exception {
        String token = registerAndGetToken("learning-roadmap@example.com");

        String roadmapJson = objectMapper.writeValueAsString(Map.of(
            "title", "Spring Boot Mastery",
            "description", "Complete learning path for Spring Boot",
            "targetDate", "2026-12-31"
        ));

        mockMvc.perform(post("/api/learning/roadmaps")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Spring Boot Mastery")));
    }

    @Test
    void addTopicToRoadmap_returns201() throws Exception {
        String token = registerAndGetToken("learning-topic@example.com");

        String roadmapJson = objectMapper.writeValueAsString(Map.of(
            "title", "Java Deep Dive",
            "description", "Advanced Java concepts",
            "targetDate", "2026-12-31"
        ));

        MvcResult roadmapResult = mockMvc.perform(post("/api/learning/roadmaps")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapJson))
                .andExpect(status().isCreated())
                .andReturn();

        String roadmapId = objectMapper.readTree(roadmapResult.getResponse().getContentAsString())
                .get("id").asText();

        String topicJson = objectMapper.writeValueAsString(Map.of(
            "title", "Concurrency",
            "description", "Java concurrency and multithreading",
            "orderIndex", 1,
            "status", "NOT_STARTED"
        ));

        mockMvc.perform(post("/api/learning/roadmaps/" + roadmapId + "/topics")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(topicJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Concurrency")));
    }

    @Test
    void updateTopicStatus_returns200() throws Exception {
        String token = registerAndGetToken("learning-topicstatus@example.com");

        String roadmapJson = objectMapper.writeValueAsString(Map.of(
            "title", "DevOps Roadmap",
            "description", "Learning DevOps tools",
            "targetDate", "2026-12-31"
        ));

        MvcResult roadmapResult = mockMvc.perform(post("/api/learning/roadmaps")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapJson))
                .andExpect(status().isCreated())
                .andReturn();

        String roadmapId = objectMapper.readTree(roadmapResult.getResponse().getContentAsString())
                .get("id").asText();

        String topicJson = objectMapper.writeValueAsString(Map.of(
            "title", "Docker",
            "description", "Containerization with Docker",
            "orderIndex", 1,
            "status", "NOT_STARTED"
        ));

        MvcResult topicResult = mockMvc.perform(post("/api/learning/roadmaps/" + roadmapId + "/topics")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(topicJson))
                .andExpect(status().isCreated())
                .andReturn();

        String topicId = objectMapper.readTree(topicResult.getResponse().getContentAsString())
                .get("id").asText();

        String statusUpdateJson = objectMapper.writeValueAsString(Map.of(
            "status", "IN_PROGRESS"
        ));

        mockMvc.perform(put("/api/learning/topics/" + topicId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusUpdateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));
    }

    @Test
    void getRoadmapWithTopics_returns200() throws Exception {
        String token = registerAndGetToken("learning-getroadmap@example.com");

        String roadmapJson = objectMapper.writeValueAsString(Map.of(
            "title", "Cloud Computing",
            "description", "Cloud platforms and services",
            "targetDate", "2026-12-31"
        ));

        MvcResult roadmapResult = mockMvc.perform(post("/api/learning/roadmaps")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapJson))
                .andExpect(status().isCreated())
                .andReturn();

        String roadmapId = objectMapper.readTree(roadmapResult.getResponse().getContentAsString())
                .get("id").asText();

        String topicJson1 = objectMapper.writeValueAsString(Map.of(
            "title", "AWS Basics",
            "description", "Introduction to AWS",
            "orderIndex", 1,
            "status", "NOT_STARTED"
        ));

        String topicJson2 = objectMapper.writeValueAsString(Map.of(
            "title", "AWS Advanced",
            "description", "Advanced AWS services",
            "orderIndex", 2,
            "status", "NOT_STARTED"
        ));

        mockMvc.perform(post("/api/learning/roadmaps/" + roadmapId + "/topics")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(topicJson1))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/learning/roadmaps/" + roadmapId + "/topics")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(topicJson2))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/learning/roadmaps/" + roadmapId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Cloud Computing")))
                .andExpect(jsonPath("$.topics", notNullValue()))
                .andExpect(jsonPath("$.topics.length()", greaterThanOrEqualTo(2)));
    }

    @Test
    void createSkill_returns201() throws Exception {
        String token = registerAndGetToken("learning-skill@example.com");

        String skillJson = objectMapper.writeValueAsString(Map.of(
            "name", "Java",
            "category", "Programming Languages",
            "proficiencyLevel", "INTERMEDIATE"
        ));

        mockMvc.perform(post("/api/learning/skills")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(skillJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Java")))
                .andExpect(jsonPath("$.category", is("Programming Languages")))
                .andExpect(jsonPath("$.proficiencyLevel", is("INTERMEDIATE")));
    }
}
