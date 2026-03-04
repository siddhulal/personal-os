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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InterviewControllerTest extends BaseIntegrationTest {

    @Test
    void createQuestion_returns201() throws Exception {
        String token = registerAndGetToken("interview-create@example.com");

        String questionJson = objectMapper.writeValueAsString(Map.of(
            "question", "What is the difference between ArrayList and LinkedList?",
            "category", "Java Collections",
            "difficulty", "MEDIUM",
            "tags", "java,collections,data-structures"
        ));

        mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.question", is("What is the difference between ArrayList and LinkedList?")))
                .andExpect(jsonPath("$.category", is("Java Collections")))
                .andExpect(jsonPath("$.difficulty", is("MEDIUM")));
    }

    @Test
    void addAnswer_returns201() throws Exception {
        String token = registerAndGetToken("interview-answer@example.com");

        String questionJson = objectMapper.writeValueAsString(Map.of(
            "question", "Explain the SOLID principles.",
            "category", "Design Patterns",
            "difficulty", "HARD",
            "tags", "oop,design-patterns,principles"
        ));

        MvcResult questionResult = mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson))
                .andExpect(status().isCreated())
                .andReturn();

        String questionId = objectMapper.readTree(questionResult.getResponse().getContentAsString())
                .get("id").asText();

        String answerJson = objectMapper.writeValueAsString(Map.of(
            "content", "SOLID stands for Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Each principle helps create maintainable and scalable software.",
            "quality", "GOOD"
        ));

        mockMvc.perform(post("/api/interview/questions/" + questionId + "/answers")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(answerJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.content", notNullValue()))
                .andExpect(jsonPath("$.quality", is("GOOD")));
    }

    @Test
    void recordPractice_returns201() throws Exception {
        String token = registerAndGetToken("interview-practice@example.com");

        String questionJson = objectMapper.writeValueAsString(Map.of(
            "question", "What is dependency injection?",
            "category", "Spring Framework",
            "difficulty", "EASY",
            "tags", "spring,di,ioc"
        ));

        MvcResult questionResult = mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson))
                .andExpect(status().isCreated())
                .andReturn();

        String questionId = objectMapper.readTree(questionResult.getResponse().getContentAsString())
                .get("id").asText();

        String practiceJson = objectMapper.writeValueAsString(Map.of(
            "questionId", questionId,
            "confidenceLevel", 4,
            "durationSeconds", 120,
            "notes", "Explained DI well, but could improve on IoC container details"
        ));

        mockMvc.perform(post("/api/interview/practice")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(practiceJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.confidenceLevel", is(4)))
                .andExpect(jsonPath("$.durationSeconds", is(120)));
    }

    @Test
    void getRandomQuestion_returns200() throws Exception {
        String token = registerAndGetToken("interview-random@example.com");

        String questionJson1 = objectMapper.writeValueAsString(Map.of(
            "question", "What is polymorphism?",
            "category", "OOP",
            "difficulty", "EASY",
            "tags", "oop,java"
        ));

        String questionJson2 = objectMapper.writeValueAsString(Map.of(
            "question", "Explain the Observer pattern.",
            "category", "Design Patterns",
            "difficulty", "MEDIUM",
            "tags", "design-patterns,behavioral"
        ));

        String questionJson3 = objectMapper.writeValueAsString(Map.of(
            "question", "What is a microservice?",
            "category", "Architecture",
            "difficulty", "MEDIUM",
            "tags", "architecture,microservices"
        ));

        mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson1))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson2))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson3))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/interview/questions/random")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.question", notNullValue()))
                .andExpect(jsonPath("$.category", notNullValue()));
    }

    @Test
    void getProgress_returns200() throws Exception {
        String token = registerAndGetToken("interview-progress@example.com");

        String questionJson = objectMapper.writeValueAsString(Map.of(
            "question", "What is a REST API?",
            "category", "Web Development",
            "difficulty", "EASY",
            "tags", "rest,api,web"
        ));

        MvcResult questionResult = mockMvc.perform(post("/api/interview/questions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(questionJson))
                .andExpect(status().isCreated())
                .andReturn();

        String questionId = objectMapper.readTree(questionResult.getResponse().getContentAsString())
                .get("id").asText();

        String practiceJson = objectMapper.writeValueAsString(Map.of(
            "questionId", questionId,
            "confidenceLevel", 5,
            "durationSeconds", 90,
            "notes", "Explained REST constraints clearly"
        ));

        mockMvc.perform(post("/api/interview/practice")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(practiceJson))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/interview/progress")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuestions", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalPracticeSessions", greaterThanOrEqualTo(1)));
    }
}
