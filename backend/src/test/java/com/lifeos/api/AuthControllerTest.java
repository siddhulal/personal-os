package com.lifeos.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends BaseIntegrationTest {

    @Test
    void registerWithValidData_returns201AndToken() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
            "email", "register-valid@example.com",
            "password", "Password123",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()));
    }

    @Test
    void registerWithDuplicateEmail_returns409() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
            "email", "duplicate@example.com",
            "password", "Password123",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isConflict());
    }

    @Test
    void registerWithInvalidEmail_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
            "email", "not-an-email",
            "password", "Password123",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerWithShortPassword_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
            "email", "shortpass@example.com",
            "password", "Ab1",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginWithValidCredentials_returns200AndToken() throws Exception {
        String registerJson = objectMapper.writeValueAsString(Map.of(
            "email", "login-valid@example.com",
            "password", "Password123",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson))
                .andExpect(status().isCreated());

        String loginJson = objectMapper.writeValueAsString(Map.of(
            "email", "login-valid@example.com",
            "password", "Password123"
        ));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()));
    }

    @Test
    void loginWithWrongPassword_returns401() throws Exception {
        String registerJson = objectMapper.writeValueAsString(Map.of(
            "email", "login-wrong@example.com",
            "password", "Password123",
            "firstName", "Test",
            "lastName", "User"
        ));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson))
                .andExpect(status().isCreated());

        String loginJson = objectMapper.writeValueAsString(Map.of(
            "email", "login-wrong@example.com",
            "password", "WrongPassword999"
        ));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMeWithValidToken_returns200AndUserInfo() throws Exception {
        String token = registerAndGetToken("me-valid@example.com");

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("me-valid@example.com")))
                .andExpect(jsonPath("$.firstName", is("Test")))
                .andExpect(jsonPath("$.lastName", is("User")));
    }

    @Test
    void getMeWithoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
